// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

{
    const { Optional, Placeholder } = require('./ast');

    function take(array, idx) {
        return array.map(function(v) { return v[idx]; });
    }
}

pattern = [{}] / pattern_no_brace

pattern_no_brace = ($([^\\${}]+) / escape / raw_param / optional_part / wrapped_param)*

escape = '$$' {
    return '$';
} / '\\' ch:. {
    return ch;
}

raw_param = '$' ident:identifier {
    return new Placeholder(ident);
}

optional_part = '${?' nested:pattern_no_brace '}' {
    return new Optional(nested);
}

wrapped_param = '${' __ param:qualified_name __ opt:option_clause? __ _default:(':-' pattern_no_brace)? '}' {
    if (opt)
        return new Placeholder(param, ...opt, _default ? _default[1] : null);
    else
        return new Placeholder(param, undefined, undefined, _default ? _default[1] : null);
}

option_clause = ':' __ opt:option? '.' precision:integer_literal {
    return [opt || '', precision];
} / ':' __ opt:option {
    return [opt, opt === '%' ? 0 : 1];
}

qualified_name = first:identifier __ rest:('.' __ identifier __)* {
    return [first, ...take(rest, 2)].join('.');
}

option "option" = '%' / $(identstart optidentchar*)
identifier "identifier" = $(identstart identchar*)

identstart = [A-Za-z_]
identchar = [A-Za-z0-9_]
optidentchar = [A-Za-z-]

integer_literal "integer" = v:$([0-9]) {
    return parseInt(v, 10);
}

__ "whitespace" = [ \r\n\t\v]*
