"use strict";
/**
 * Module for parsing and evaluating equations
 * 
 * Restrictions:
 *  - Variable names must start with a letter, underscore, or at-sign (@), after which all characters must be in the set [a-zA-Z0-9_]
 *  - Variable names must be unique within an execution of evaluateEquation
 *  - No circular dependencies
 *  - Decimal points must be preceded by a digit
 *  - Implicit multiplication is not allowed (e.g.- "2x" and "4(x+1)" are invalid and should instead be "2*x" and "4*(x+1)")
 *  - Parentheses must be closed
 * 
 * Variables are stored as objects in order to include metadata that may be useful.
 */

/**
 * @typedef {String} VariableName
 * @typedef {String} Equation
 * @typedef {Number} Result
 * 
 * @typedef {Object} Variable
 * @property {VariableName} name - The name of the variable
 * @property {Equation|Result} value - The value of the variable
 * @property {Boolean} disabled - Whether the variable is disabled
 * @property {String} comment - A comment for the variable
 * 
 * @typedef {Map<VariableName, Variable>} Variables
 */

/**
 * @readonly
 * @enum {String}
 */
export const ERROR = {
    VARIABLE_NOT_FOUND: "variable_not_found",
    CYCLICAL_DEPENDENCY: "cyclical_dependency",
    MISSING_CLOSING_PARENTHESIS: "missing_closing_parenthesis",
    MORE_CLOSING_PARENS: "more_closing_parens",
    MORE_OPENING_PARENS: "more_opening_parens",
    FAILED_TO_SUBSTITUTE_VARIABLE: "failed_to_substitute_variable",
    VARIABLE_DISABLED: "variable_disabled",
    FAILED_TO_RESOLVE_PARENTHESES: "failed_to_resolve_parentheses",
    FAILED_TO_EVALUATE_OPERATION: "failed_to_evaluate_operation",
    EMPTY_STRING: "empty_string",
    FAILED_TO_PARSE_EQUATION: "failed_to_parse_equation",
}

/**
 * @typedef {Object} ParseResult
 * @property {Boolean} result - Whether the variable was successfully parsed
 * @property {Number} [value] - The parsed variable value
 * @property {String} [error] - The error message if the variable was not successfully parsed
 * @property {ERROR} [errortype] - The type of error if the variable was not successfully parsed
 */
 
/**
 * @callback missingVariableCallback
 * @param {VariableName} variableName - The name of the missing variable
 * @returns {Variable|null} - The missing variable or null
 */

/**
 * Parses and evaluates an equation.
 * @param {Equation} equation - The equation to evaluate
 * @param {Variables} variables - The variables to use
 * @param {VariableName[]} [dependencies] - Variables that are dependent on the equation (this is normally not supplied by the user)
 * @param {missingVariableCallback} [missing] - A function that is called when a variable is not found. It takes the variable name as an argument and should return a Variable object or null.
 * @returns {ParseResult} - The result of the equation evaluation
 */
export function evaluateEquation(equation, variables = {}, dependencies = undefined, missing = undefined){
    if(dependencies == undefined) dependencies = [];

    // Set to undefined to disable debugging,
    // otherwise should be an integer representing spacing per indent
    var DEBUGTAB;
    function log(...args){
        if(typeof DEBUGTAB == "undefined") return;
        console.log(" ".repeat(DEBUGTAB*2), ...args);
    }
    var DEBUGDEC = ()=>{if (typeof DEBUGTAB != "undefined") DEBUGTAB--;}
    var DEBUGINC = ()=>{if (typeof DEBUGTAB != "undefined") DEBUGTAB++;}    

    DEBUGINC();

    /**
     * Substitutes variables in the equation and then returns the result of resolveParentheses
     * @param {Equation} equation - The equation to substitute
     * @param {Variables} variables - The variables to use
     * @param {VariableName[]} dependencies - Variables that are dependent on the equation (this is normally not supplied by the user)
     * @returns {ParseResult} - The result of resolveParentheses
     */
    function substituteVariables(equation, variables, dependencies){
        DEBUGINC();
        var VARIABLEREG = /@?[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/;
        let variable
        while((variable = VARIABLEREG.exec(equation)) !== null){
            let variablename = variable[0];
            log("Substituting variable:", variablename);
            if(variables[variablename] == undefined || variables[variablename].value == undefined){
                if(missing){
                    DEBUGINC();
                    log("Variable not found, calling missing callback:", variablename);
                    let missingVar = missing(variablename);
                    if(missingVar){
                        variables[variablename] = missingVar;
                    }
                    DEBUGDEC();
                }
                if(variables[variablename] == undefined || variables[variablename].value == undefined){
                    DEBUGDEC();
                    return {result: false, error: "Variable not found: " + variablename, errortype: ERROR.VARIABLE_NOT_FOUND};
                    // throw new Error("Failed to substitute variable: " + variable[0]);
                }
            }
            if(variables[variablename].disabled){
                DEBUGDEC();
                return {result: false, error: "Variable is disabled: " + variablename + " in " + equation, errortype: ERROR.VARIABLE_DISABLED};
                // throw new Error("Variable is disabled: " + variablename + " in " + equation);
            }
            if(dependencies.includes(variablename)){
                DEBUGDEC();
                return {result: false, error: "Cyclical dependency: " + variablename + " in " + equation, errortype: ERROR.CYCLICAL_DEPENDENCY};
                // throw new Error("Cyclical dependency: " + variablename + " in " + equation);
            }
            if(typeof variables[variablename].value == "string"){
                let depcopy = [...dependencies];
                depcopy.push(variablename);
                let result = evaluateEquation(variables[variablename].value, variables, depcopy);
                if(!result.result){
                    DEBUGDEC();
                    return {result: false, error: "Failed to evaluate variable: " + variablename, errortype: ERROR.FAILED_TO_EVALUATE_VARIABLE};
                }
                variables[variablename].value = result.value;
            }
            let eq = equation;
            equation = equation.slice(0, variable.index) + variables[variablename].value + equation.slice(variable.index + variablename.length);
            if(eq == equation){
                DEBUGDEC();
                return {result: false, error: "Failed to substitute variable: " + variable[0] + "in " + eq + " >>> result: " + equation, errortype: ERROR.FAILED_TO_SUBSTITUTE_VARIABLE};
                // throw new Error("Failed to substitute variable: " + variable[0] + "in " + eq + " >>> result: " + equation);                    
            }
        }
        DEBUGDEC();
        let result = checkParentheses(equation);
        if(!result.result){
            return result;
        }
        return resolveParentheses(equation, variables, dependencies);
    }
    /** Because of the way we're resolving the paretheses, it's easiest to count them before
     *  resolving instead of trying to track open and closing parens.
     * @param {Equation} equation - The equation to check
     */
    function checkParentheses(equation){
        let open = equation.split("(").length - 1;
        let close = equation.split(")").length - 1;
        if(open == close) return {result: true};
        if(open > close){
            return {result: false, error: "More closing parentheses than opening: " + equation, errortype: ERROR.MORE_CLOSING_PARENS};
            // throw new Error("More opening parentheses than closing: " + equation);
        }
        return {result: false, error: "More opening parentheses than closing: " + equation, errortype: ERROR.MORE_OPENING_PARENS};
        // throw new Error("More closing parentheses than opening: " + equation);
    }

    /**
     * Resolves all parentheses in the equation recursively and then returns the result of evaluateOperations
     * @param {Equation} equation - The equation to resolve
     * @param {Variables} variables - The variables to use (not used in this function)
     * @param {VariableName[]} dependencies - Variables that are dependent on the equation (this is normally not supplied by the user; not used in this function)
     * @returns {ParseResult} - The result of evaluateOperations
     */
    function resolveParentheses(equation, variables, dependencies){
        DEBUGINC();
        // log(equation)
        
        let open = equation.indexOf("(");
        let close = equation.indexOf(")");
        if(open < 0 && close < 0){
            DEBUGDEC();
            return evaluateOperations(equation, variables, dependencies);
        }
        if(open > 0 && close < 0){
            DEBUGDEC();
            return {result: false, error: "Missing closing parenthesis: " + equation, errortype: ERROR.MISSING_CLOSING_PARENTHESIS};
            // throw new Error("Missing closing parenthesis: " + equation);
        }
        if(open < 0 || close < open){
            let result = resolveParentheses(equation.slice(0,close), variables, dependencies);
            if(!result.result){
                DEBUGDEC();
                return result;
            }
            return {result: true, value: result.value + equation.slice(close+1)};
        }
        let eq = equation;
        let result = resolveParentheses(equation.slice(open+1), variables, dependencies);
        if(!result.result){
            DEBUGDEC();
            return result;
        }
        equation = equation.slice(0, open)+ result.value;
        if(eq == equation){
            DEBUGDEC();
            return {result: false, error: "Failed to resolve parentheses: " + eq + " >>> result: " + equation, errortype: ERROR.FAILED_TO_RESOLVE_PARENTHESES};
            // throw new Error("Failed to resolve parentheses: " + eq + " >>> result: " + equation);
        }
        // log("returning:", equation);
        DEBUGDEC();
        return resolveParentheses(equation, variables, dependencies);
    }

    /**
     * Evaluates operations in the equation and replaces them with their results, ultimately returning the result
     * @param {Equation} equation - The equation to evaluate
     * @param {Variables} variables - The variables to use (not used in this function)
     * @param {VariableName[]} dependencies - Variables that are dependent on the equation (this is normally not supplied by the user; not used in this function)
     * @returns {ParseResult} - The result of the equation
     */
    function evaluateOperations(equation, variables, dependencies){
        DEBUGINC();
        var OPERATIONPRIORITY = [
            [
                ["^", (a,b)=>Math.pow(a,b)],
            ],
            [
                ["*", (a,b)=>a*b],
                ["//", (a,b)=>Math.floor(a/b)],
                ["/", (a,b)=>a/b],
                ["%", (a,b)=>a%b],
            ],
            [
                ["+", (a,b)=>a+b],
                ["-", (a,b)=>a-b],
            ],
        ];

        for(let operation of OPERATIONPRIORITY){
            let match, f;
            let regs = [];
            for (let [operator, func] of operation){
                regs.push(new RegExp("(?:^\\+)?(?<a>-?\\d+(?:\\.\\d+)?)\\s*\\"+operator+"\\s*(?<b>-?\\d+(?:\\.\\d+)?)", "g"));
            }

            for(let i = 0; i < regs.length; i++){
                let reg = regs[i];
                let func = operation[i][1];
                let m = reg.exec(equation);
                if(m == null) continue;
                if(!match || m.index < match.index){
                    match = m;
                    f = func;
                }
            }

            if(!match) continue;

            let a = parseValue(match.groups.a);
            let b = parseValue(match.groups.b);
            let eq = equation;

            if(!a.result || !b.result){
                DEBUGDEC();
                return {result: false, error: "Failed to evaluate operation: " + equation, errortype: ERROR.FAILED_TO_EVALUATE_OPERATION};
            }

            // log(equation, a, f, b, match.index, match[0].length);

            equation = equation.slice(0, match.index) + f(a.value,b.value) + equation.slice(match.index + match[0].length);

            if(eq == equation){
                DEBUGDEC();
                return {result: false, error: "Failed to evaluate operation: " + equation, errortype: ERROR.FAILED_TO_EVALUATE_OPERATION};
                // throw new Error("Failed to evaluate operation: " + equation);
            }

            DEBUGDEC();
            return evaluateOperations(equation, variables, dependencies);
        }

        DEBUGDEC();
        return parseValue(equation, variables, dependencies);
    }

    /**
     * Parses the result of the equation
     * @param {Equation} equation - The equation to parse
     * @param {Variables} variables - The variables to use
     * @param {VariableName[]} dependencies - Variables that are dependent on the equation
     * @returns {ParseResult} - The result of the equation
     */
    function parseValue(equation, variables, dependencies){
        DEBUGINC();
        log("Parsing value:", equation);
        // Number() converts empty strings and whitespace-exclusive
        // strings to 0, so we need to check that first
        if(!equation.trim()){
            DEBUGDEC();
            return {result: false, error: "Empty String: \""+equation+"\"", errortype: ERROR.EMPTY_STRING};
            // throw new Error(`Empty String: "${equation}"`);
        }
        let result = Number(equation);
        if(isNaN(result)){
            DEBUGDEC();
            return {result: false, error: "Failed to parse equation: " + equation, errortype: ERROR.FAILED_TO_PARSE_EQUATION};
            // throw new Error(`Failed to parse equation: ${equation}`);
        }
        DEBUGDEC();
        return {result: true, value: result};
    }

    equation = equation+"";
    if(equation.startsWith("=")) equation = equation.slice(1);
    let result = substituteVariables(equation, variables, dependencies);
    DEBUGDEC();
    return result;
}
