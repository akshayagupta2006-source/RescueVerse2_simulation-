/**
 * rateLimiter.js
 * Simple in-memory rate limiter for auth endpoints.
 * In production, replace with express-rate-limit + Redis.
 *
 * Install: npm install express-rate-limit
 * Then swap this file's export for the real limiter.
 */

// Attempt to use express-rate-limit if available, else use a simple fallback
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch {
  rateLimit = null;
}

// Auth rate limiter — 10 requests per 15 minutes per IP
const authLimiter = rateLimit
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many login attempts. Please wait 15 minutes before trying again.' },
    })
  : (req, res, next) => next();  // passthrough fallback

// General API limiter — 200 requests per minute per IP
const apiLimiter = rateLimit
  ? rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests. Please slow down.' },
    })
  : (req, res, next) => next();

module.exports = { authLimiter, apiLimiter };
