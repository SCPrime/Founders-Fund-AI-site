import '@testing-library/jest-dom';
// Prefer React.act instead of ReactDOMTestUtils.act to avoid deprecation warnings in React 18/19
import * as React from 'react';

// Re-export React.act for tests that need manual act usage (React namespace ensures types)
// The `act` helper exists at runtime; TypeScript's react types may not expose it in older @types.
export const act: (callback: () => void | Promise<void>) => void | Promise<void> = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act || (() => {});

// Set up global React for JSX
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).React = React;
