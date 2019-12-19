// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const TTUnits = require('thingtalk-units');

function measureToString(value, precision, unit) {
    // check unit is valid
    TTUnits.normalizeUnit(unit);
    return TTUnits.transformFromBaseUnit(value, unit).toFixed(precision);
}

const PARAM_REGEX = /\$(?:\$|([a-zA-Z0-9_]+(?![a-zA-Z0-9_]))|{([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)(?::(%|[a-zA-Z-]+))?})/;

function get(obj, propchain) {
    for (let prop of propchain.split('.'))
        obj = obj[prop];
    return obj;
}

function* chunks(string) {
    let clone = new RegExp(PARAM_REGEX, 'g');
    let match = clone.exec(string);

    let i = 0;
    while (match !== null) {
        if (match.index > i)
            yield string.substring(i, match.index);

        let [chunk, param1, param2, opt] = match;
        if (chunk === '$$')
            yield '$';
        else
            yield [chunk, param1 || param2, opt];
        i = clone.lastIndex;
        match = clone.exec(string);
    }
    if (i < string.length)
        yield string.substring(i, string.length);
}

function formatValue(value, opt) {
    if (value instanceof Date)
        value = value.toISOString();
    if (typeof value === 'number') {
        if (opt === '%') {
            value = value*100;
            opt = '';
        }
        if (opt)
            return measureToString(value, 1, opt);
        else
            return (Math.floor(value) === value ? value.toFixed(0) : value.toFixed(2));
    }
    if (opt === 'url')
        return encodeURIComponent(value);
    else
        return value;
}

function interpolate(string, args, options = {}) {
    let buffer = '';

    for (let chunk of chunks(string)) {
        if (typeof chunk === 'string') {
            buffer += chunk;
            continue;
        }

        const [,param,opt] = chunk;
        const value = typeof args === 'function' ? args(param) : get(args, param);
        buffer += formatValue(value, opt);
    }

    return buffer;
}
interpolate.chunks = chunks;

module.exports = interpolate;
