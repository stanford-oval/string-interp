// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

{
    function take(array, idx) {
        return array.map(function(v) { return v[idx]; });
    }
}

pattern = ($([^$]+) / escape / raw_param / wrapped_param)*

escape = '$$' {
    return '$';
}

raw_param = '$' ident:identifier {
    return [text(), ident, ''];
}

wrapped_param = '${' __ param:qualified_name __ opt:(':' __ option __)? '}' {
    return [text(), param, opt ? opt[2] : ''];
}

qualified_name = first:identifier __ rest:('.' __ identifier __)* {
    return [first, ...take(rest, 2)].join('.');
}

option "option" = '%' / $(identstart optidentchar*)
identifier "identifier" = $(identstart identchar*)

identstart = [A-Za-z_]
identchar = [A-Za-z0-9_]
optidentchar = [A-Za-z0-9_-]

__ "whitespace" = [ \r\n\t\v]*
