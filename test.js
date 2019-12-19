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

function main() {
    testBasic();
    testNested();
    testFuncReplacement();
    testChunks();
}
main();
