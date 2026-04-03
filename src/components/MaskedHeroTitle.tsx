type MaskedHeroTitleProps = {
  title: string;
  textColor: string;
};

const MaskedHeroTitle = ({ title, textColor }: MaskedHeroTitleProps) => {
    const maskedStyle = {
        color: textColor,
        background: `linear-gradient(90deg, transparent 50%, white 50%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    return (
        <h1 style={maskedStyle}>
            {title}
        </h1>
    );
};

export default MaskedHeroTitle;
