import React from "react";
import { parseToMathNodes, type MathNode } from "./math-node";

interface MathRendererProps {
  expression: string | MathNode[];
  className?: string;
  cursorPosition?: number;
  showCursor?: boolean;
}

export function MathRenderer({
  expression,
  className = "",
  cursorPosition,
  showCursor = false,
}: MathRendererProps) {
  const nodes = typeof expression === "string" ? parseToMathNodes(expression) : expression;

  if (nodes.length === 0) {
    return <span className="text-gray-600 font-mono">0</span>;
  }

  return (
    <span className={`inline-flex items-baseline flex-wrap font-mono select-text ${className}`}>
      {renderNodeList(nodes)}
      {showCursor && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-accent-cyan animate-pulse align-middle" />
      )}
    </span>
  );
}

export function renderNodeList(nodes: MathNode[]): React.ReactNode[] {
  return nodes.map((node, index) => renderSingleNode(node, `node-${index}`));
}

export function renderSingleNode(node: MathNode, key: string): React.ReactNode {
  switch (node.type) {
    case "number":
      return (
        <span key={key} className="text-white font-mono">
          {node.value}
        </span>
      );

    case "variable":
      return (
        <span key={key} className="italic text-accent-cyan font-serif px-0.5">
          {node.name}
        </span>
      );

    case "constant":
      return (
        <span key={key} className="font-serif text-accent-amber px-0.5" title={node.name}>
          {node.symbol}
        </span>
      );

    case "binary_op":
      return (
        <span key={key} className="text-accent-cyan/90 px-1 font-semibold">
          {node.operator}
        </span>
      );

    case "unary_op":
      return (
        <span key={key} className="text-accent-cyan/90">
          {node.operator}
          {renderSingleNode(node.operand, `${key}-op`)}
        </span>
      );

    case "power":
      return (
        <span key={key} className="inline-flex items-baseline">
          {renderSingleNode(node.base, `${key}-base`)}
          <sup className="text-[0.72em] -top-[0.6em] text-accent-cyan font-semibold ml-0.5">
            {renderSingleNode(node.exponent, `${key}-exp`)}
          </sup>
        </span>
      );

    case "fraction":
      return (
        <span
          key={key}
          className="inline-flex flex-col items-center justify-center align-middle mx-1 text-[0.88em]"
        >
          <span className="border-b border-white/40 px-1 text-center w-full pb-0.5">
            {renderNodeList(node.numerator)}
          </span>
          <span className="px-1 text-center w-full pt-0.5 text-gray-300">
            {renderNodeList(node.denominator)}
          </span>
        </span>
      );

    case "radical":
      return (
        <span key={key} className="inline-flex items-center align-middle mx-0.5">
          {node.degree && (
            <sup className="text-[0.6em] -mr-1 text-accent-cyan">
              {renderSingleNode(node.degree, `${key}-deg`)}
            </sup>
          )}
          <span className="text-accent-cyan font-serif text-[1.15em] leading-none">√</span>
          <span className="border-t border-accent-cyan/80 pl-1 pr-0.5 pt-0.5">
            {renderNodeList(node.radicand)}
          </span>
        </span>
      );

    case "function":
      return (
        <span key={key} className="inline-flex items-baseline">
          <span className="text-accent-cyan/90 font-sans font-medium">{node.name}</span>
          <span className="text-gray-400 font-sans">(</span>
          {node.args.map((arg, i) => (
            <React.Fragment key={`${key}-arg-${i}`}>
              {i > 0 && <span className="text-gray-500 mr-1">,</span>}
              {renderNodeList(arg)}
            </React.Fragment>
          ))}
          <span className="text-gray-400 font-sans">)</span>
        </span>
      );

    case "parentheses":
      return (
        <span key={key} className="inline-flex items-baseline">
          <span className="text-gray-400 font-sans">(</span>
          {renderNodeList(node.content)}
          <span className="text-gray-400 font-sans">)</span>
        </span>
      );

    case "factorial":
      return (
        <span key={key} className="inline-flex items-baseline">
          {renderSingleNode(node.operand, `${key}-operand`)}
          <span className="text-accent-amber font-bold">!</span>
        </span>
      );

    case "subscript":
      return (
        <span key={key} className="inline-flex items-baseline">
          {renderSingleNode(node.base, `${key}-base`)}
          <sub className="text-[0.7em] text-gray-400 ml-0.5">
            {renderSingleNode(node.subscript, `${key}-sub`)}
          </sub>
        </span>
      );

    case "group":
      return <React.Fragment key={key}>{renderNodeList(node.children)}</React.Fragment>;

    default:
      return null;
  }
}
