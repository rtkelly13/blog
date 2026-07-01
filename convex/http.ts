import { httpRouter } from 'convex/server';
import { auth } from './auth';

// Convex Auth's OAuth callback + sign-in routes live on the deployment's
// .convex.site HTTP-actions domain (e.g. /api/auth/callback/github).
const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
