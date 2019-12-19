// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const interp = require('.');

function testBasic() {
    assert.strictEqual(interp('foo'), 'foo');
    assert.strictEqual(interp(''), '');

    assert.strictEqual(interp('$a $a$aa$a,a', { a: '1', aa: '2' }), '1 121,a');
    assert.strictEqual(interp('${a} ${a}a ${aa}', { a: '1', aa: '2' }), '1 1a 2');
    assert.strictEqual(interp('${a} ${a:url}', { a: '/' }), '/ %2F');
    assert.strictEqual(interp('$a$$a', { a: '1' }), '1$a');
}

function testNested() {
    assert.strictEqual(interp('${a.b} ${a.c} ${d}', {
        a: {
            b: '1',
            c: '2',
        },
        d: '3'
    }), '1 2 3');
}

function testFuncReplacement() {
    let cnt = 0;
    assert.strictEqual(interp('$a${a}${a:url}', (param) => {
        assert.strictEqual(param, 'a');
        return '/' + (cnt++);
    }), '/0/1%2F2');
}

function testChunks() {
    assert.deepStrictEqual(Array.from(interp.chunks('foo')), ['foo']);
}

function testFormatValueLocalized() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };
    let date = new Date(2018, 4, 23, 21, 18, 0);
    let date2 = new Date(2018, 12, 7, 10, 30, 0);

    // date
    assert.strictEqual(interp('${v}', { v: date }, options), '5/23/2018, 9:18:00 PM');
    assert.strictEqual(interp('${v:date}', { v: date }, options), 'Wednesday, May 23, 2018');
    assert.strictEqual(interp('${v:time}', { v: date }, options), '9:18:00 PM PDT');

    // number
    assert.strictEqual(interp('${v}', { v: 3 }, options), '3');
    assert.strictEqual(interp('${v}', { v: 3.1 }, options), '3.1');
    assert.strictEqual(interp('${v}', { v: 3.12 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.123 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.1234 }, options), '3.12');

    // string & object
    assert.strictEqual(interp('${v}', { v: 'string' }, options), 'string');
    assert.strictEqual(interp('${v}', { v: {} }, options), '[object Object]');
    assert.strictEqual(interp('${v}', { v: { display: 'foo' } }, options), 'foo');

    //assert.strictEqual(formatter.measureToString(21, 0, 'C'), '21');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'C'), '21');
    assert.strictEqual(interp('${v:C} C', { v: 21 }, options), '21 C');
    assert.strictEqual(interp('${v:C} C', { v: 21.5 }, options), '21.5 C');
    //assert.strictEqual(formatter.measureToString(21, 0, 'F'), '70');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'F'), '69');
    assert.strictEqual(interp('${v:F} F', { v: 21 }, options), '69.8 F');

    assert.strictEqual(interp('${v:m}', { v: 1000 }, options), '1,000');
    assert.strictEqual(interp('${v:km}', { v: 1000 }, options), '1');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$ null 69.8 2018-05-24T04:18:00.000Z 42 10 9.5');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$ null 69.8 2018-05-24T04:18:00.000Z 42 10 9.5');

    assert.deepStrictEqual(interp('$v1 ${v1} ${v1:enum}', {
        v1: 'some_enum'
    }, options), 'some_enum some_enum some enum');

    assert.deepStrictEqual(interp('$v1 ${v2:F} ${v3} ${v3:iso-date} ${v4:%}', {
        v1: ['lol', 'cat'],
        v2: [21, 42],
        v3: [date, date2],
        v4: [0.42, 0.84],
    }, options), 'lol, cat 69.8, 107.6 5/23/2018, 9:18:00 PM, 1/7/2019, 10:30:00 AM 2018-05-24T04:18:00.000Z, 2019-01-07T18:30:00.000Z 42, 84');
}

function testFormatValueNonLocalized() {
    const options = {
        locale: 'C',
        timezone: 'America/Los_Angeles',
    };
    let date = new Date(2018, 4, 23, 21, 18, 0);
    let date2 = new Date(2018, 12, 7, 10, 30, 0);

    // date
    assert.strictEqual(interp('${v}', { v: date }, options), 'Wed May 23 2018 21:18:00 GMT-0700 (Pacific Daylight Time)');
    assert.strictEqual(interp('${v:date}', { v: date }, options), 'Wed May 23 2018');
    assert.strictEqual(interp('${v:time}', { v: date }, options), '21:18:00 GMT-0700 (Pacific Daylight Time)');

    // number
    assert.strictEqual(interp('${v}', { v: 3 }, options), '3');
    assert.strictEqual(interp('${v}', { v: 3.1 }, options), '3.10');
    assert.strictEqual(interp('${v}', { v: 3.12 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.123 }, options), '3.12');
    assert.strictEqual(interp('${v}', { v: 3.1234 }, options), '3.12');

    // string & object
    assert.strictEqual(interp('${v}', { v: 'string' }, options), 'string');
    assert.strictEqual(interp('${v}', { v: {} }, options), '[object Object]');
    assert.strictEqual(interp('${v}', { v: { display: 'foo' } }, options), 'foo');

    //assert.strictEqual(formatter.measureToString(21, 0, 'C'), '21');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'C'), '21');
    assert.strictEqual(interp('${v:C} C', { v: 21 }, options), '21 C');
    assert.strictEqual(interp('${v:C} C', { v: 21.5 }, options), '21.5 C');
    //assert.strictEqual(formatter.measureToString(21, 0, 'F'), '70');
    //assert.strictEqual(formatter.measureToString(20.5, 0, 'F'), '69');
    assert.strictEqual(interp('${v:F} F', { v: 21 }, options), '69.8 F');

    assert.strictEqual(interp('${v:m}', { v: 1000 }, options), '1000');
    assert.strictEqual(interp('${v:km}', { v: 1000 }, options), '1');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$ null 69.8 2018-05-24T04:18:00.000Z 42 10 9.50');

    assert.deepStrictEqual(interp('$v1$$foo$$ ${v2} ${v3:F} ${v4:iso-date} ${v5:%} ${v6} ${v7}', {
        v1: 'lol',
        v2: null,
        v3: 21,
        v4: date,
        v5: 0.42,
        v6: 10,
        v7: 9.5
    }, options), 'lol$foo$ null 69.8 2018-05-24T04:18:00.000Z 42 10 9.50');

    assert.deepStrictEqual(interp('$v1 ${v1} ${v1:enum}', {
        v1: 'some_enum'
    }, options), 'some_enum some_enum some enum');

    assert.deepStrictEqual(interp('$v1 ${v2:F} ${v3} ${v3:iso-date} ${v4:%}', {
        v1: ['lol', 'cat'],
        v2: [21, 42],
        v3: [date, date2],
        v4: [0.42, 0.84],
    }, options), 'lol, cat 69.8, 107.6 Wed May 23 2018 21:18:00 GMT-0700 (Pacific Daylight Time), Mon Jan 07 2019 10:30:00 GMT-0800 (Pacific Standard Time) 2018-05-24T04:18:00.000Z, 2019-01-07T18:30:00.000Z 42, 84');
}

function testLocation() {
    const options = {
        locale: 'en-US',
        timezone: 'America/Los_Angeles',
    };
    class Location {
        constructor(lat, lon, display = null) {
            this.lat = lat;
            this.lon = lon;
            this.display = display;
        }

        toString() {
            return `[latitude: ${this.lat.toFixed(3)} deg, longitude: ${this.lon.toFixed(3)} deg]`;
        }

        toLocaleString() {
            if (this.display)
                return this.display;

            return `[localized latitude: ${this.lat.toFixed(3)} deg, longitude: ${this.lon.toFixed(3)} deg]`;
        }
    }

    let location = new Location(-37, 113);
    assert.strictEqual(interp('${v}', { v: location }, options), '[localized latitude: -37.000 deg, longitude: 113.000 deg]');
    assert.strictEqual(interp('${v}', { v: location }), '[latitude: -37.000 deg, longitude: 113.000 deg]');

    location = new Location(-37, 113, "Somewhere");
    assert.strictEqual(interp('${v}', { v: location }, options), 'Somewhere');
    assert.strictEqual(interp('${v}', { v: location }), '[latitude: -37.000 deg, longitude: 113.000 deg]');

    // old style lat/lon
    assert.strictEqual(interp('${v:lat} ${v:lon}', { v: location }, options), '-37 113');

    // new style lat/lon
    assert.strictEqual(interp('${v.lat} ${v.lon}', { v: location }, options), '-37 113');
}

function main() {
    testBasic();
    testNested();
    testFuncReplacement();
    testChunks();
    testFormatValueLocalized();
    testFormatValueNonLocalized();
    testLocation();

}
main();
