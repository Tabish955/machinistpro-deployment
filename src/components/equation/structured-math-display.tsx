import React from "react";
import type { ASTNode } from "@/lib/equation/ast";

interface StructuredMathDisplayProps {
  node?: ASTNode;
  className?: string;
}

export function StructuredMathDisplay({ node, className = "" }: StructuredMathDisplayProps) {
  if (!node) {
    return <span className="text-gray-600 font-mono">0</span>;
  }

  return (
    <span className={`inline-flex items-baseline flex-wrap font-mono select-text ${className}`}>
      {renderAST(node)}
    </span>
  );
}

function renderAST(node: ASTNode, key = "root"): React.ReactNode {
  switch (node.type) {
    case "number":
      return (
        <span key={key} className="text-white font-mono font-semibold">
          {node.value}
        </span>
      );

    case "variable":
      return (
        <span key={key} className="italic text-accent-cyan font-serif px-0.5 font-medium">
          {node.name}
        </span>
      );

    case "constant":
      return (
        <span key={key} className="font-serif text-accent-amber px-0.5 font-bold" title={node.name}>
          {node.symbol}
        </span>
      );

    case "binary_op":
      return (
        <span key={key} className="inline-flex items-baseline gap-1">
          {renderAST(node.left, `${key}-l`)}
          <span className="text-accent-cyan/90 px-1 font-bold">
            {node.operator}
          </span>
          {renderAST(node.right, `${key}-r`)}
        </span>
      );

    case "unary_op":
      return (
        <span key={key} className="inline-flex items-baseline">
          <span className="text-accent-cyan/90 font-bold">{node.operator}</span>
          {renderAST(node.operand, `${key}-op`)}
        </span>
      );

    case "power":
      return (
        <span key={key} className="inline-flex items-baseline">
          {renderAST(node.base, `${key}-base`)}
          <sup className="text-[0.72em] -top-[0.6em] text-accent-cyan font-bold ml-0.5 tracking-tight">
            {renderAST(node.exponent, `${key}-exp`)}
          </sup>
        </span>
      );

    case "fraction":
      return (
        <span
          key={key}
          className="inline-flex flex-col items-center justify-center align-middle mx-1 text-[0.9em]"
        >
          <span className="border-b border-white/40 px-1.5 text-center w-full pb-0.5 font-semibold text-white">
            {renderAST(node.numerator, `${key}-num`)}
          </span>
          <span className="px-1.5 text-center w-full pt-0.5 text-gray-300 font-semibold">
            {renderAST(node.denominator, `${key}-den`)}
          </span>
        </span>
      );

    case "radical":
      return (
        <span key={key} className="inline-flex items-baseline mx-0.5">
          {node.degree && (
            <sup className="text-[0.68em] -top-[0.6em] text-accent-amber font-mono mr-0.5">
              {renderAST(node.degree, `${key}-deg`)}
            </sup>
          )}
          <span className="text-accent-cyan font-serif text-[1.1em] font-light leading-none">√</span>
          <span className="border-t border-accent-cyan/70 px-1 ml-[-1px] pt-0.5 inline-block">
            {renderAST(node.radicand, `${key}-rad`)}
          </span>
        </span>
      );

    case "subscript":
      return (
        <span key={key} className="inline-flex items-baseline">
          {renderAST(node.base, `${key}-base`)}
          <sub className="text-[0.72em] bottom-[-0.25em] text-gray-400 font-mono ml-0.5">
            {renderAST(node.subscript, `${key}-sub`)}
          </sub>
        </span>
      );

    case "function":
      return (
        <span key={key} className="inline-flex items-baseline">
          <span className="text-purple-300 font-medium">{node.name}</span>
          {node.power && (
            <sup className="text-[0.72em] -top-[0.6em] text-accent-cyan font-bold ml-0.5">
              {renderAST(node.power, `${key}-fn-exp`)}
            </sup>
          )}
          <span className="text-gray-400 font-light">(</span>
          {node.args.map((arg, idx) => (
            <React.Fragment key={`${key}-arg-${idx}`}>
              {idx > 0 && <span className="text-gray-500 mr-1">,</span>}
              {renderAST(arg, `${key}-arg-${idx}`)}
            </React.Fragment>
          ))}
          <span className="text-gray-400 font-light">)</span>
        </span>
      );

    case "parentheses":
      return (
        <span key={key} className="inline-flex items-baseline">
          <span className="text-gray-400 font-light">(</span>
          {renderAST(node.content, `${key}-inner`)}
          <span className="text-gray-400 font-light">)</span>
        </span>
      );

    case "unit":
      return (
        <span key={key} className="inline-flex items-baseline gap-1">
          {renderAST(node.value, `${key}-val`)}
          <span className="text-emerald-400 font-mono text-[0.88em] font-semibold bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
            {node.unitString}
          </span>
        </span>
      );

    case "matrix":
      return (
        <span key={key} className="inline-flex items-center mx-1 border-l-2 border-r-2 border-accent-cyan/60 px-1 py-0.5 rounded-sm">
          <span className="inline-grid gap-1 text-center">
            {node.elements.map((row, rIdx) => (
              <span key={`${key}-r-${rIdx}`} className="flex gap-2 justify-center">
                {row.map((cell, cIdx) => (
                  <span key={`${key}-c-${rIdx}-${cIdx}`} className="px-1 font-mono text-xs">
                    {renderAST(cell, `${key}-cell-${rIdx}-${cIdx}`)}
                  </span>
                ))}
              </span>
            ))}
          </span>
        </span>
      );
  }
}
