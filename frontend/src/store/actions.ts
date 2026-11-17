import { createAction } from '@reduxjs/toolkit';

/** Dispatched on logout or when the API says the token is no longer valid. */
export const loggedOut = createAction('session/loggedOut');
