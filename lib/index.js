// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const TTUnits = require('thingtalk-units');

const Formatter = require('./formatter');
const parser = require('./grammar');
const { get, clean } = require('./utils');

function chunks(string) {
    return parser.parse(string);
}

function formatFallback(value, precision, formatter) {
    if (typeof value === 'number')
        return formatter.numberToString(value, precision);

    if (typeof value === 'object' && value !== null) {
        // if value has a non-trivial toLocaleString, use it
        if (value.toLocaleString !== Object.prototype.toLocaleString)
            return formatter.anyToString(value);

        // check both own values and prototype chain, in case .display is an accessor
        if ('display' in value) {
            const display = value.display;
            if (display)
                return String(display);
        }
    }

    return formatter.anyToString(value);
}

const ALLOWED_OPTIONS = new Set(['%', 'iso-date', 'date', 'time', 'url', 'enum', 'lat', 'lon']);
function formatValue(value, param, opt, precision, formatter, formatEnum) {
    if (Array.isArray(value))
        return formatter.listToString(value.map((v) => formatValue(v, param, opt, precision, formatter, formatEnum)));

    switch (opt) {
    case '':
        return formatFallback(value, precision, formatter);

    case '%':
        value *= 100;
        return formatFallback(value, precision, formatter);

    case 'iso-date':
        return value.toISOString();

    case 'date':
        return formatter.dateToString(value);

    case 'time':
        return formatter.timeToString(value);

    case 'url':
        return encodeURIComponent(value);

    case 'enum':
        return String(formatEnum(value, param));

    // deprecated, should be `param.lat` instead
    case 'lat':
    case 'lon':
        return formatFallback(value[opt], precision, formatter);

    default: // unit
        return formatter.measureToString(value, precision, opt);
    }
}

function typecheckOptions(parsed) {
    for (let chunk of parsed) {
        if (typeof chunk === 'string')
            continue;

        const [,,opt] = chunk;
        if (opt === '')
            continue;
        if (ALLOWED_OPTIONS.has(opt))
            continue;

        // everything else is treated as a unit
        TTUnits.normalizeUnit(opt);
    }
}

function compile(string, options = {}) {
    const parsed = chunks(string);
    typecheckOptions(parsed);
    const formatter = new Formatter(options.locale || 'C', options.timezone);
    const formatEnum = options.formatEnum || clean;

    return function(args) {
        let buffer = '';
        for (let chunk of parsed) {
            if (typeof chunk === 'string') {
                buffer += chunk;
                continue;
            }

            const [,param,opt,precision] = chunk;
            const value = typeof args === 'function' ? args(param) : get(args, param);
            buffer += formatValue(value, param, opt, precision, formatter, formatEnum);
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
