import { type ReactNode, useRef, useState } from 'react';

interface Props {
  children: ReactNode;
}

const Pre = ({ children }: Props) => {
  const textInput = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const onEnter = () => {
    setHovered(true);
  };
  const onExit = () => {
    setHovered(false);
    setCopied(false);
  };
  const onCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText(textInput.current.innerText);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div
      ref={textInput}
      onMouseEnter={onEnter}
      onMouseLeave={onExit}
      className="relative border-2 border-white bg-black"
    >
      {hovered && (
        <button
          aria-label="Copy code"
          type="button"
          className={`absolute right-2 top-2 w-8 h-8 p-1 border-2 bg-black font-mono text-xs uppercase ${
            copied
              ? 'focus:outline-hidden focus:border-brutalist-neonGreen border-brutalist-neonGreen text-brutalist-neonGreen'
              : 'border-white text-white hover:bg-white hover:text-black'
          } transition-colors`}
          onClick={onCopy}
        >
          {copied ? '✓' : '⎘'}
        </button>
      )}

      <pre className="font-mono text-brutalist-neonGreen">{children}</pre>
    </div>
  );
};

export default Pre;
