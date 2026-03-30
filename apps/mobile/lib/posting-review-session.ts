import type { GeneratedPosting } from './types';

let postingReviewSession: GeneratedPosting | null = null;

export function setPostingReviewSession(generated: GeneratedPosting) {
  postingReviewSession = generated;
}

export function getPostingReviewSession(): GeneratedPosting | null {
  return postingReviewSession;
}

export function clearPostingReviewSession() {
  postingReviewSession = null;
}
