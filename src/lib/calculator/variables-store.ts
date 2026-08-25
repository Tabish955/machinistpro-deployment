/**
 * Variables & Custom Functions Store
 * Provides topological dependency resolution and multi-variable evaluation
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { evaluate } from "mathjs";

export interface UserVariable {
  name: string;
  expression: string;
  value: number | null;
  error?: string | null;
}

export interface UserFunction {
  name: string;
  args: string[];
  expression: string;
}

interface VariablesState {
  variables: Record<string, UserVariable>;
  functions: Record<string, UserFunction>;
  setVariable: (name: string, expression: string) => void;
  removeVariable: (name: string) => void;
  setFunction: (name: string, args: string[], expression: string) => void;
  removeFunction: (name: string) => void;
  recomputeAll: () => void;
  getEvaluationScope: () => Record<string, any>;
  clearAll: () => void;
}

export const useVariablesStore = create<VariablesState>()(
  persist(
    (set, get) => ({
      variables: {
        a: { name: "a", expression: "5", value: 5, error: null },
        b: { name: "b", expression: "a^2 + 2", value: 27, error: null },
      },
      functions: {
        f: { name: "f", args: ["x"], expression: "x^2 + 2*x + 1" },
      },

      setVariable: (name, expression) => {
        const cleanName = name.trim();
        if (!cleanName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cleanName)) return;

        const nextVars = {
          ...get().variables,
          [cleanName]: { name: cleanName, expression, value: null, error: null },
        };

        set({ variables: nextVars });
        get().recomputeAll();
      },

      removeVariable: (name) => {
        const nextVars = { ...get().variables };
        delete nextVars[name];
        set({ variables: nextVars });
        get().recomputeAll();
      },

      setFunction: (name, args, expression) => {
        const cleanName = name.trim();
        if (!cleanName) return;
        set((state) => ({
          functions: {
            ...state.functions,
            [cleanName]: { name: cleanName, args, expression },
          },
        }));
      },

      removeFunction: (name) => {
        const nextFns = { ...get().functions };
        delete nextFns[name];
        set({ functions: nextFns });
      },

      recomputeAll: () => {
        const vars = { ...get().variables };
        const scope: Record<string, any> = {
          pi: Math.PI,
          e: Math.E,
          phi: (1 + Math.sqrt(5)) / 2,
        };

        // Topological multiple-pass solve
        const keys = Object.keys(vars);
        for (let pass = 0; pass < keys.length + 2; pass++) {
          for (const key of keys) {
            const v = vars[key];
            try {
              const res = evaluate(v.expression, scope);
              if (typeof res === "number" && Number.isFinite(res)) {
                v.value = res;
                v.error = null;
                scope[key] = res;
              } else {
                v.value = null;
                v.error = "Non-numeric result";
              }
            } catch (err: any) {
              v.value = null;
              v.error = err.message;
            }
          }
        }

        set({ variables: vars });
      },

      getEvaluationScope: () => {
        const scope: Record<string, any> = {
          pi: Math.PI,
          e: Math.E,
          phi: (1 + Math.sqrt(5)) / 2,
        };

        const { variables, functions } = get();
        for (const [k, v] of Object.entries(variables)) {
          if (v.value !== null) scope[k] = v.value;
        }

        for (const [k, f] of Object.entries(functions)) {
          scope[k] = (...callArgs: number[]) => {
            const fnScope = { ...scope };
            f.args.forEach((argName, idx) => {
              fnScope[argName] = callArgs[idx] ?? 0;
            });
            return evaluate(f.expression, fnScope);
          };
        }

        return scope;
      },

      clearAll: () => {
        set({ variables: {}, functions: {} });
      },
    }),
    {
      name: "machinistpro_variables_store",
    },
  ),
);
