import { useRef, useState } from 'react';

interface NewsletterFormProps {
  title?: string;
}

const NewsletterForm = ({
  title = 'Subscribe to the newsletter',
}: NewsletterFormProps) => {
  const inputEl = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const res = await fetch('/api/newsletter', {
      body: JSON.stringify({
        email: inputEl.current?.value,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const { error: responseError } = await res.json();

    if (responseError) {
      setError(true);
      setMessage(
        'Your email address is invalid or you are already subscribed!',
      );
      return;
    }

    inputEl.current!.value = '';
    setError(false);
    setSubscribed(true);
    setMessage('Successfully subscribed!');
  };

  return (
    <div className="font-mono">
      <div className="pb-2 text-lg font-bold text-white uppercase tracking-widest">
        {'>'} {title}
      </div>
      <form className="flex flex-col sm:flex-row gap-4" onSubmit={subscribe}>
        <div>
          <label htmlFor="email-input" className="relative block">
            <span className="sr-only">Email address</span>
            <span className="absolute left-3 top-2 font-mono text-brutalist-cyan font-bold">
              &gt;
            </span>
            <input
              autoComplete="email"
              className="w-72 rounded-sm px-8 py-2 font-mono focus:border-brutalist-cyan focus:outline-hidden focus:ring-2 focus:ring-brutalist-cyan bg-black border-2 border-zinc-700 placeholder-zinc-500 text-white"
              id="email-input"
              name="email"
              placeholder={
                subscribed
                  ? 'subscribed_successfully'
                  : 'enter_email_address...|'
              }
              ref={inputEl}
              required
              type="email"
              disabled={subscribed}
            />
          </label>
        </div>
        <div className="flex w-full sm:w-auto">
          <button
            className={`w-full rounded-sm px-6 py-2 font-mono font-bold text-black border-2 transition-all uppercase ${
              subscribed
                ? 'cursor-default bg-zinc-500 border-zinc-500 text-white'
                : 'bg-brutalist-cyan border-brutalist-cyan hover:bg-black hover:text-brutalist-cyan'
            }`}
            type="submit"
            disabled={subscribed}
          >
            {subscribed ? 'VERIFIED' : 'EXECUTE'}
          </button>
        </div>
      </form>
      {(message || error) && (
        <div
          className={`pt-2 text-sm uppercase ${
            error ? 'text-brutalist-pink' : 'text-brutalist-neonGreen'
          }`}
        >
          {error ? `[ERROR]: ${message}` : `[SUCCESS]: ${message}`}
        </div>
      )}
    </div>
  );
};

export default NewsletterForm;
