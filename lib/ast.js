// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

class Placeholder {
    constructor(param, option = '', precision = 2, _default = null) {
        this.param = param;
        this.option = option;
        this.precision = precision;
        this.default = _default;
    }
}

class Optional {
    constructor(pattern) {
        this.pattern = pattern;
    }
}

module.exports = {
    Placeholder,
    Optional
};
