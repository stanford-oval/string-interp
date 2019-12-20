// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const { Placeholder, Optional, Plural, Select } = require('./ast');

const TTUnits = require('thingtalk-units');

const Formatter = require('./formatter');
const parser = require('./grammar');
const { get, } = require('./utils');

function parse(string) {
    return parser.parse(string);
}

const ALLOWED_OPTIONS = new Set(['%', 'iso-date', 'date', 'time', 'url', 'enum', 'lat', 'lon']);

function typecheck(parsed) {
    for (let chunk of parsed) {
        if (typeof chunk === 'string')
            continue;

        if (chunk instanceof Placeholder) {
            if (chunk.default)
                typecheck(chunk.default);
            if (chunk.option === '')
                continue;
            if (ALLOWED_OPTIONS.has(chunk.option))
                continue;

            // everything else is treated as a unit
            TTUnits.normalizeUnit(chunk.option);
        }

        if (chunk instanceof Optional)
            typecheck(chunk.pattern);

        if (chunk instanceof Select || chunk instanceof Plural) {
            for (let variant of chunk.variants.values())
                typecheck(variant);
        }
    }
}

function isNullish(value) {
    return value === undefined || value === null || value === '' ||
        Number.isNaN(value) || (value instanceof Date && Number.isNaN(+value));
}

function replace(formatter, parsed, args, failIfAllMissing, failIfAnyMissing, nullReplacement) {
    let buffer = '';
    let anyFailed = false;
    let allFailed = true;

    for (let chunk of parsed) {
        if (typeof chunk === 'string') {
            buffer += chunk;
            continue;
        }

        if (chunk instanceof Select) {
            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);

            let variant;
            if (isNullish(value))
                variant = chunk.variants.get('null');
            else if (chunk.variants.has(value))
                variant = chunk.variants.get(value);
            else
                variant = chunk.variants.get('null');

            let replacement;
            if (variant)
                replacement = replace(formatter, variant, args, failIfAnyMissing, false, nullReplacement);
            if (replacement === undefined) {
                anyFailed = true;
                continue;
            }
            buffer += replacement;
            allFailed = false;
        }

        if (chunk instanceof Plural) {
            let value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);
            let variant;
            if (typeof value !== 'number' || isNullish(value))
                variant = chunk.variants.get('other');
            else if (chunk.variants.has(value))
                variant = chunk.variants.get(value);
            else
                variant = chunk.variants.get(formatter.getPluralType(value, chunk.type));

            let replacement;
            if (variant)
                replacement = replace(formatter, variant, args, failIfAnyMissing, false, nullReplacement);
            if (replacement === undefined) {
                anyFailed = true;
                continue;
            }
            buffer += replacement;
            allFailed = false;
        }

        if (chunk instanceof Placeholder) {
            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);
            if (isNullish(value)) {
                if (chunk.default) {
                    const replacement = replace(formatter, chunk.default, args, true, false, nullReplacement);
                    if (replacement !== undefined) {
                        allFailed = false;
                        buffer += replacement;
                    } else {
                        anyFailed = true;
                        buffer += nullReplacement;
                    }
                } else {
                    anyFailed = true;
                    buffer += nullReplacement;
                }
            } else {
                buffer += formatter.formatValue(value, chunk);
                allFailed = false;
            }
        }

        if (chunk instanceof Optional) {
            const replacement = replace(formatter, chunk.pattern, args, true, true, nullReplacement);
            if (replacement === undefined)
                continue;
            buffer += replacement;
        }
    }
    if (failIfAnyMissing && anyFailed)
        return undefined;
    // note that "allFailed" will be true if there are no placeholders, hence we check "anyFailed" too
    if (failIfAllMissing && anyFailed && allFailed)
        return undefined;

    return buffer;
}

function compile(string, options = {}) {
    const parsed = parse(string);
    typecheck(parsed);
    const failIfMissing = options.failIfMissing === undefined ? true : options.failIfMissing;
    const nullReplacement = options.nullReplacement || '';
    const formatter = new Formatter(options.locale || 'C', options.timezone, options.formatEnum);

    return function(args) {
        return replace(formatter, parsed, args, failIfMissing, false, nullReplacement);
    };
}

function interpolate(string, args, options) {
    return compile(string, options)(args);
}
interpolate.parse = parse;
interpolate.compile = compile;
interpolate.Formatter = Formatter;
interpolate.Placeholder = Placeholder;
interpolate.Optional = Optional;
interpolate.Plural = Plural;
interpolate.Select = Select;

module.exports = interpolate;
