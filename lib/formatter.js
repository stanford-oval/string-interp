// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Units = require('thingtalk-units');

const { clean, } = require('./utils');

/**
 * Formatting utilities.
 *
 * This class provides an abstraction over {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl|the Intl API}
 * that ensures the correct locale and timezone information are used.
 *
 * @package
 */
class Formatter {
    /**
     * Construct a new format utils object.
     *
     * @param {string} locale - the user's locale, as a BCP47 tag
     * @param {string} timezone - the user's timezone, as a string in the IANA timezone database (e.g. America/Los_Angeles, Europe/Rome)
     */
    constructor(locale, timezone, formatEnum = clean) {
        this._locale = locale;
        this._timezone = timezone;
        this._formatEnum = formatEnum;
    }

    formatFallback(value, precision) {
        if (typeof value === 'number')
            return this.numberToString(value, precision);

        if (typeof value === 'object' && value !== null) {
            // if value has a non-trivial toLocaleString, use it
            if (value.toLocaleString !== Object.prototype.toLocaleString)
                return this.anyToString(value);

            // check both own values and prototype chain, in case .display is an accessor
            if ('display' in value) {
                const display = value.display;
                if (display)
                    return String(display);
            }
        }

        return this.anyToString(value);
    }

    formatValue(value, chunk) {
        if (Array.isArray(value))
            return this.listToString(value.map((v) => this.formatValue(v, chunk)));

        switch (chunk.option) {
        case '':
            return this.formatFallback(value, chunk.precision);

        case '%':
            value *= 100;
            return this.formatFallback(value, chunk.precision);

        case 'iso-date':
            return value.toISOString();

        case 'date':
            return this.dateToString(value);

        case 'time':
            return this.timeToString(value);

        case 'url':
            return encodeURIComponent(value);

        case 'enum':
            return String(this._formatEnum(value, chunk.param));

        // deprecated, should be `param.lat` instead
        case 'lat':
        case 'lon':
            return this.formatFallback(value[chunk.option], chunk.precision);

        default: // unit
            return this.measureToString(value, chunk.precision, chunk.option);
        }
    }

    anyToString(value) {
        if (this._locale === 'C' || value === null || value === undefined)
            return String(value);
        else
            return value.toLocaleString(this._locale);
    }

    listToString(array) {
        if (this._locale === 'C' || !Intl.ListFormat)
            return array.join(', ');
        return new Intl.ListFormat(this._locale).format(array);
    }

    /**
     * Convert a measurement to a user-visible string.
     *
     * @param {number} value - the value, in the ThingTalk base unit (e.g. Celius for temperature, meters for distance)
     * @param {number} [precision] - the number of digits after the decimal separator, defaults to 0
     * @param {string} unit - the unit to display as, as a ThingTalk unit code
     * @return {string} the formatted measurement
     */
    measureToString(value, precision, unit) {
        value = Units.transformFromBaseUnit(value, unit);
        return this.numberToString(value, precision);
    }

    numberToString(value, precision) {
        if (this._locale === 'C') {
            if (value === Math.floor(value))
                return String(value);
            else
                return value.toFixed(precision);
        }
        return value.toLocaleString(this._locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: precision
        });
    }

    /**
     * Convert a date to a user-visible string (without the time part).
     *
     * This is a small wrapper over {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString|Date.toLocaleString}
     * that applies the correct timezone.
     *
     * @param {Date} date - the date to display
     * @param {Object} [options] - additional options to pass to `toLocaleString`
     * @return {string} the formatted date
     */
    dateToString(date, options) {
        if (this._locale === 'C')
            return date.toDateString();
        if (!options) {
            options = {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            };
        }
        options.timeZone = this._timezone;

        return date.toLocaleDateString(this._locale, options);
    }

    /**
     * Convert a date object to a user-visible string, displaying _only_ the time part.
     *
     * This is a small wrapper over {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString|Date.toLocaleString}
     * that applies the correct timezone.
     *
     * @param {Date} date - the time to display
     * @param {Object} [options] - additional options to pass to `toLocaleString`
     * @return {string} the formatted time
     */
    timeToString(date, options) {
        if (this._locale === 'C')
            return date.toTimeString();
        if (!options) {
            options = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
            };
        }
        options.timeZone = this._timezone;
        return date.toLocaleTimeString(this._locale, options);
    }

    /**
     * Convert a date object to a user-visible string, displaying both the date and the time part.
     *
     * This is a small wrapper over {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString|Date.toLocaleString}
     * that applies the correct timezone.
     *
     * @param {Date} date - the date to display
     * @param {Object} [options] - additional options to pass to `toLocaleString`
     * @return {string} the formatted date
     */
    dateAndTimeToString(date, options = {}) {
        if (this._locale === 'C')
            return date.toISOString();
        options.timeZone = this._timezone;
        return date.toLocaleString(this._locale, options);
    }
}
module.exports = Formatter;
