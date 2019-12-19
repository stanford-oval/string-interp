// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const { Placeholder } = require('./ast');

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

        if (chunk.option === '')
            continue;
        if (ALLOWED_OPTIONS.has(chunk.option))
            continue;

        // everything else is treated as a unit
        TTUnits.normalizeUnit(chunk.option);
    }
}

function compile(string, options = {}) {
    const parsed = parse(string);
    typecheck(parsed);
    const formatter = new Formatter(options.locale || 'C', options.timezone, options.formatEnum);

    return function(args) {
        let buffer = '';
        for (let chunk of parsed) {
            if (typeof chunk === 'string') {
                buffer += chunk;
                continue;
            }

            const value = typeof args === 'function' ? args(chunk.param) : get(args, chunk.param);
            buffer += formatter.formatValue(value, chunk);
        }

        return buffer;
    };
}

function interpolate(string, args, options) {
    return compile(string, options)(args);
}
interpolate.parse = parse;
interpolate.compile = compile;
interpolate.Placeholder = Placeholder;

module.exports = interpolate;
