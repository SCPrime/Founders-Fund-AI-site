/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from 'react'

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Element extends React.JSX.Element {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ElementClass extends React.JSX.ElementClass {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
  }
}