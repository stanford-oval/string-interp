// -*- mode: ts; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

import * as Units from 'thingtalk-units';

import { clean, } from './utils';
import { Placeholder } from './ast';

export type EnumFormatter = (x : string, opt ?: string) => string;

interface LocationLike {
    lat : number;
    lon : number;
}

/**
 * Formatting utilities.
 *
 * This class provides an abstraction over {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl|the Intl API}
 * that ensures the correct locale and timezone information are used.
 */
export default class Formatter {
    private _locale : string;
    private _timezone : string|undefined;
    private _formatEnum : EnumFormatter;

    /**
     * Construct a new format utils object.
     *
     * @param locale - the user's locale, as a BCP47 tag
     * @param timezone - the user's timezone, as a string in the IANA timezone database (e.g. America/Los_Angeles, Europe/Rome)
     */
    constructor(locale : string|undefined, timezone : string|undefined, formatEnum : EnumFormatter = clean) {
        this._locale = locale || 'C';
        this._timezone = timezone;
        this._formatEnum = formatEnum;
    }

    getPluralType(number : number, type : Intl.PluralRuleType|undefined) : string {
        if (this._locale === 'C')
            return number === 1 ? 'one' : 'other';
        return new Intl.PluralRules(this._locale, { type }).select(number);
    }

    formatFallback(value : unknown, precision : number) : string {
        if (typeof value === 'number')
            return this.numberToString(value, precision);

        if (typeof value === 'object' && value !== null) {
            // if value has a non-trivial toLocaleString, use it
            if (value.toLocaleString !== Object.prototype.toLocaleString)
                return this.anyToString(value);

            // check both own values and prototype chain, in case .display is an accessor
            if ('display' in value) {
                const display = (value as ({ display : unknown })).display;
                if (display)
                    return String(display);
            }
        }

        return this.anyToString(value);
    }

    formatValue(value : unknown, chunk : Placeholder) : string {
        if (Array.isArray(value))
            return this.listToString(value.map((v) => this.formatValue(v, chunk)), { type: chunk.arraystyle });

        switch (chunk.option) {
        case '':
            return this.formatFallback(value, chunk.precision);

        case '%': {
            let num = value as number;
            num *= 100;
            return this.formatFallback(num, chunk.precision);
        }

        case 'iso-date':
            return (value as Date).toISOString();

        case 'date':
            return this.dateToString(value as Date);

        case 'time':
            return this.timeToString(value as Date);

        case 'url':
            return encodeURIComponent(value as string);

        case 'enum':
            return String(this._formatEnum(value as string, chunk.param));

        // deprecated, should be `param.lat` instead
        case 'lat':
        case 'lon':
            return this.formatFallback((value as LocationLike)[chunk.option], chunk.precision);

        default: // unit
            return this.measureToString(value as number, chunk.precision, chunk.option);
        }
    }

    anyToString(value : unknown) : string {
        if (this._locale === 'C' || value === null || value === undefined)
            return String(value);
        else
            return (value as number).toLocaleString(this._locale);
    }

    listToString(array : unknown[], options : any = {}) : string {
        if (this._locale === 'C')
            return array.join(', ');

        if (!(Intl as any).ListFormat) {
            if (this._locale.startsWith('en-')) {
                // emulate ListFormat for node 10
                if (array.length === 0)
                    return '';
                if (array.length === 1)
                    return String(array[0]);
                if (options.type === 'disjunction') {
                    if (array.length === 2)
                        return array.join(' or ');
                    else
                        return array.slice(0, array.length-1).join(', ') + ', or ' + array[array.length-1];
                } else {
                    if (array.length === 2)
                        return array.join(' and ');
                    else
                        return array.slice(0, array.length-1).join(', ') + ', and ' + array[array.length-1];
                }
            } else {
                return array.join(', ');
            }
        }
        return new (Intl as any).ListFormat(this._locale, options).format(array);
    }

    /**
     * Convert a measurement to a user-visible string.
     *
     * @param {number} value - the value, in the ThingTalk base unit (e.g. Celius for temperature, meters for distance)
     * @param {number} [precision] - the number of digits after the decimal separator, defaults to 0
     * @param {string} unit - the unit to display as, as a ThingTalk unit code
     * @return {string} the formatted measurement
     */
    measureToString(value : number, precision  = 0, unit : string) : string {
        value = Units.transformFromBaseUnit(value, unit);
        return this.numberToString(value, precision);
    }

    numberToString(value : number, precision  = 0) : string {
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
    dateToString(date : Date, options ?: Intl.DateTimeFormatOptions) : string {
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
    timeToString(date : Date, options ?: Intl.DateTimeFormatOptions) : string {
        if (this._locale === 'C')
            return date.toTimeString();
        if (!options) {
            options = {
                hour: 'numeric',
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
    dateAndTimeToString(date : Date, options : Intl.DateTimeFormatOptions = {}) : string {
        if (this._locale === 'C')
            return date.toISOString();
        options.timeZone = this._timezone;
        return date.toLocaleString(this._locale, options);
    }
}
