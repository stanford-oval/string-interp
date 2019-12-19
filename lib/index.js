// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const TTUnits = require('thingtalk-units');
const parser = require('./grammar');

function measureToString(value, precision, unit) {
    // check unit is valid
    TTUnits.normalizeUnit(unit);
    return TTUnits.transformFromBaseUnit(value, unit).toFixed(precision);
}

function get(obj, propchain) {
    for (let prop of propchain.split('.'))
        obj = obj[prop];
    return obj;
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

function chunks(string) {
    return parser.parse(string);
}

function compile(string, options = {}) {
    const parsed = chunks(string);
    return function(args) {
        let buffer = '';
        for (let chunk of parsed) {
            if (typeof chunk === 'string') {
                buffer += chunk;
                continue;
            }

            const [,param,opt] = chunk;
            const value = typeof args === 'function' ? args(param) : get(args, param);
            buffer += formatValue(value, opt);
        }

        return buffer;
    };
}

function interpolate(string, args, options) {
    return compile(string, options)(args);
}
interpolate.compile = compile;
interpolate.chunks = chunks;

module.exports = interpolate;
