import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

type RenderResult = {
  container: HTMLElement;
  rerender: (ui: React.ReactElement) => void;
  unmount: () => void;
};

type RenderHookResult<T> = {
  result: { current: T };
  rerender: (props?: unknown) => void;
  unmount: () => void;
};

const resolveContainer = (): HTMLElement => {
  document.body.innerHTML = '';
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
};

const buildQueryContainer = (): HTMLElement => document.body;

const queryByText = (container: HTMLElement, text: string): HTMLElement | null => {
  const elements = Array.from(container.querySelectorAll<HTMLElement>('*'));
  return elements.find((element) => element.textContent === text) ?? null;
};

const queryByRole = (container: HTMLElement, role: string): HTMLElement | null => {
  if (role === 'img') {
    return container.querySelector<HTMLElement>('img, [role="img"]');
  }
  if (role === 'button') {
    return container.querySelector<HTMLElement>('button, [role="button"]');
  }
  return container.querySelector<HTMLElement>(`[role="${role}"]`);
};

export const screen = {
  getByText: (text: string) => {
    const element = queryByText(buildQueryContainer(), text);
    if (!element) {
      throw new Error(`Unable to find element with text: ${text}`);
    }
    return element;
  },
  queryByText: (text: string) => queryByText(buildQueryContainer(), text),
  getByRole: (role: string) => {
    const element = queryByRole(buildQueryContainer(), role);
    if (!element) {
      throw new Error(`Unable to find element with role: ${role}`);
    }
    return element;
  },
  queryByRole: (role: string) => queryByRole(buildQueryContainer(), role),
};

export const render = (ui: React.ReactElement): RenderResult => {
  const container = resolveContainer();
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    rerender: (nextUi) => {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

export const renderHook = <TResult, TProps = unknown>(
  callback: (props: TProps) => TResult,
  options?: { initialProps?: TProps }
): RenderHookResult<TResult> => {
  const container = resolveContainer();
  const root = createRoot(container);
  const result: { current: TResult } = { current: undefined as TResult };
  let currentProps = options?.initialProps;

  const HookWrapper = ({ hookProps }: { hookProps: TProps }) => {
    result.current = callback(hookProps);
    return null;
  };

  const renderWithProps = (props: TProps) => {
    act(() => {
      root.render(<HookWrapper hookProps={props} />);
    });
  };

  renderWithProps(currentProps as TProps);

  return {
    result,
    rerender: (nextProps?: unknown) => {
      if (nextProps !== undefined) {
        currentProps = nextProps as TProps;
      }
      renderWithProps(currentProps as TProps);
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

export { act };
