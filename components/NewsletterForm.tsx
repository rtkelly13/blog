import { useRef, useState } from 'react';
import siteMetadata from '@/data/siteMetadata';

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
    <div>
      <div className="pb-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
        {title}
      </div>
      <form className="flex flex-col sm:flex-row" onSubmit={subscribe}>
        <div>
          <label htmlFor="email-input">
            <span className="sr-only">Email address</span>
            <input
              autoComplete="email"
              className="w-72 rounded-md px-4 py-2 focus:border-transparent focus:outline-hidden focus:ring-2 focus:ring-primary-600 dark:bg-black"
              id="email-input"
              name="email"
              placeholder={
                subscribed ? "You're subscribed!" : 'Enter your email'
              }
              ref={inputEl}
              required
              type="email"
              disabled={subscribed}
            />
          </label>
        </div>
        <div className="mt-2 flex w-full rounded-md shadow-xs sm:ml-3 sm:mt-0">
          <button
            className={`w-full rounded-md bg-primary-500 px-4 py-2 font-medium text-white sm:py-0 ${
              subscribed
                ? 'cursor-default'
                : 'hover:bg-primary-700 dark:hover:bg-primary-400'
            } focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 dark:ring-offset-black`}
            type="submit"
            disabled={subscribed}
          >
            {subscribed ? 'Thank you!' : 'Sign up'}
          </button>
        </div>
      </form>
      {(message || error) && (
        <div
          className={`w-72 pt-2 text-sm ${
            error
              ? 'text-red-500 dark:text-red-400'
              : 'text-green-500 dark:text-green-400'
          } sm:w-96`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default NewsletterForm;
