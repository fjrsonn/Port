import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaRedoAlt, FaTimes } from 'react-icons/fa';
import type { AgentRoute } from '../../lib/agentApi';

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
const typingAnimationStore = new Map<string, { typingStartAt: number; completionNotified: boolean }>();

const buildScrambledText = (text: string, revealCount: number) =>
  text
    .split('')
    .map((character, index) => {
      if (character === ' ') return ' ';
      if (index < revealCount) return text[index];
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    })
    .join('');

type PanelScrambleTextProps = {
  text: string;
  className: string;
  delayMs?: number;
};

function PanelScrambleText({ text, className, delayMs = 0 }: PanelScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    if (!text) {
      setDisplayText('');
      return;
    }

    let timerId: number | null = null;
    let currentStep = 0;
    const totalSteps = Math.max(12, text.replace(/\s+/g, '').length * 4);

    const runStep = () => {
      currentStep += 1;
      const progress = Math.min(currentStep / totalSteps, 1);
      const revealCount = Math.floor(progress * text.length);

      setDisplayText(progress >= 1 ? text : buildScrambledText(text, revealCount));

      if (progress < 1) {
        timerId = window.setTimeout(runStep, 34);
      }
    };

    timerId = window.setTimeout(() => {
      setDisplayText(buildScrambledText(text, 0));
      timerId = window.setTimeout(runStep, 44);
    }, delayMs);

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [delayMs, text]);

  return <span className={className}>{displayText}</span>;
}

type PanelTypedTextProps = {
  text: string;
  className: string;
  animationKey: string;
  shouldAnimate?: boolean;
  startDelayMs?: number;
  typingDelayMs?: number;
  onAnimationComplete?: () => void;
};

function PanelTypedText({
  text,
  className,
  animationKey,
  shouldAnimate = true,
  startDelayMs = 140,
  typingDelayMs = 22,
  onAnimationComplete,
}: PanelTypedTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isGlowVisible, setIsGlowVisible] = useState(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);

  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    if (!text) {
      setDisplayText('');
      setIsGlowVisible(false);
      return;
    }

    if (!shouldAnimate) {
      setDisplayText(text);
      setIsGlowVisible(false);
      return;
    }

    let rafId: number | null = null;
    let glowTimerId: number | null = null;

    const storedAnimation =
      typingAnimationStore.get(animationKey) ??
      {
        typingStartAt: performance.now() + startDelayMs,
        completionNotified: false,
      };

    typingAnimationStore.set(animationKey, storedAnimation);

    setDisplayText('');
    setIsGlowVisible(false);

    const syncTypingFrame = (now: number) => {
      if (now < storedAnimation.typingStartAt) {
        setDisplayText('');
        rafId = window.requestAnimationFrame(syncTypingFrame);
        return;
      }

      const elapsed = now - storedAnimation.typingStartAt;
      const nextLength = Math.min(text.length, Math.floor(elapsed / typingDelayMs) + 1);
      setDisplayText(text.slice(0, nextLength));

      if (nextLength >= text.length) {
        if (!storedAnimation.completionNotified) {
          storedAnimation.completionNotified = true;
          typingAnimationStore.set(animationKey, storedAnimation);
          setIsGlowVisible(true);
          onAnimationCompleteRef.current?.();
          glowTimerId = window.setTimeout(() => {
            setIsGlowVisible(false);
          }, 1150);
        }
        return;
      }

      rafId = window.requestAnimationFrame(syncTypingFrame);
    };

    rafId = window.requestAnimationFrame(syncTypingFrame);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (glowTimerId !== null) window.clearTimeout(glowTimerId);
    };
  }, [animationKey, shouldAnimate, startDelayMs, text, typingDelayMs]);

  return (
    <p className={`${className}${isGlowVisible ? ' hero-agent-panel__copy--glow' : ''}`}>
      {displayText}
    </p>
  );
}

export type HeroAgentTurn = {
  id: string;
  question: string;
  answer: string;
  error: string;
  status: 'loading' | 'answered' | 'error';
  route: AgentRoute | null;
  questionTypingPlayed: boolean;
  answerTypingPlayed: boolean;
};

type HeroAgentPanelProps = {
  isVisible: boolean;
  turns: HeroAgentTurn[];
  route: AgentRoute | null;
  onClose: () => void;
  onRetry: (question: string) => void;
  onQuestionTypingComplete: (id: string) => void;
  onAnswerTypingComplete: (id: string) => void;
};

export function HeroAgentPanel({
  isVisible,
  turns,
  route,
  onClose,
  onRetry,
  onQuestionTypingComplete,
  onAnswerTypingComplete,
}: HeroAgentPanelProps) {
  const panelBodyRef = useRef<HTMLDivElement | null>(null);
  const routeLabel = route === 'profile' ? 'perfil' : route === 'generic' ? 'geral' : 'agente';
  const shouldFollowLatestMessage = turns.some(
    (turn) => turn.status === 'loading' || (Boolean(turn.answer || turn.error) && !turn.answerTypingPlayed),
  );

  useEffect(() => {
    if (!isVisible) return;

    const body = panelBodyRef.current;
    if (!body) return;

    let rafId: number | null = null;

    const syncScrollToBottom = () => {
      body.scrollTop = body.scrollHeight;
      if (shouldFollowLatestMessage) {
        rafId = window.requestAnimationFrame(syncScrollToBottom);
      }
    };

    syncScrollToBottom();

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [isVisible, shouldFollowLatestMessage, turns]);

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.aside
          key="hero-agent-panel"
          className="hero-agent-panel"
          initial={{ opacity: 0, x: '-50%', y: 18, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: '-50%', y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: '-50%', y: 14, filter: 'blur(10px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
        >
          <div className="hero-agent-panel__header">
            <div className="hero-agent-panel__eyebrow">
              <PanelScrambleText text="Agente" className="hero-agent-panel__label" />
              <PanelScrambleText text={routeLabel} className="hero-agent-panel__badge" delayMs={70} />
            </div>

            <button type="button" className="hero-agent-panel__icon-button" onClick={onClose} aria-label="Fechar painel">
              <FaTimes />
            </button>
          </div>

          <div ref={panelBodyRef} className="hero-agent-panel__body">
            {turns.map((turn, index) => {
              const scrambleBaseDelay = index * 110;
              const typingBaseDelay = 140 + index * 48;
              const answerText = turn.status === 'error' ? turn.error : turn.answer;
              const canRevealAnswer = turn.questionTypingPlayed || !turn.question;

              return (
                <article key={turn.id} className="hero-agent-panel__turn">
                  <section className="hero-agent-panel__message hero-agent-panel__message--question">
                    <PanelScrambleText
                      text="Pergunta"
                      className="hero-agent-panel__section-label"
                      delayMs={scrambleBaseDelay}
                    />
                    <PanelTypedText
                      text={turn.question}
                      className="hero-agent-panel__copy"
                      animationKey={`${turn.id}-question`}
                      shouldAnimate={!turn.questionTypingPlayed}
                      startDelayMs={typingBaseDelay}
                      typingDelayMs={24}
                      onAnimationComplete={() => onQuestionTypingComplete(turn.id)}
                    />
                  </section>

                  {canRevealAnswer ? (
                    <section className="hero-agent-panel__message hero-agent-panel__message--answer">
                      <PanelScrambleText
                        text="Resposta"
                        className="hero-agent-panel__section-label"
                        delayMs={scrambleBaseDelay + 70}
                      />

                      {turn.status === 'loading' ? (
                        <div className="hero-agent-panel__loading-row">
                          <span className="hero-agent-panel__loading-text">Analisando e preparando a resposta</span>
                          <span className="hero-agent-panel__loading-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
                        </div>
                      ) : (
                        <PanelTypedText
                          text={answerText}
                          className={`hero-agent-panel__copy${turn.status === 'error' ? ' hero-agent-panel__copy--error' : ''}`}
                          animationKey={`${turn.id}-answer`}
                          shouldAnimate={!turn.answerTypingPlayed}
                          startDelayMs={typingBaseDelay + 70}
                          typingDelayMs={18}
                          onAnimationComplete={() => onAnswerTypingComplete(turn.id)}
                        />
                      )}

                      {turn.status === 'error' ? (
                        <button type="button" className="hero-agent-panel__retry-button" onClick={() => onRetry(turn.question)}>
                          <FaRedoAlt />
                          <span>Tentar novamente</span>
                        </button>
                      ) : null}
                    </section>
                  ) : null}
                </article>
              );
            })}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
