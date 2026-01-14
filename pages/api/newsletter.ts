import type { NextApiRequest, NextApiResponse } from 'next';
import siteMetadata from '@/data/siteMetadata';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Check if newsletter is enabled
  if (!siteMetadata.newsletter?.enabled) {
    return res.status(503).json({ error: 'Newsletter is not enabled' });
  }

  try {
    const API_KEY = process.env.BUTTONDOWN_API_KEY;

    if (!API_KEY) {
      return res
        .status(500)
        .json({ error: 'Newsletter API key not configured' });
    }

    const response = await fetch(
      'https://api.buttondown.email/v1/subscribers',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_address: email }),
      },
    );

    if (response.status >= 400) {
      const data = await response.json();
      return res.status(response.status).json({
        error: data.detail || 'There was an error subscribing to the list.',
      });
    }

    return res.status(201).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
