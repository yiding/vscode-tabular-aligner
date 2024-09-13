# tabular-aligner README

Align text based on arbitrary delimiter patterns.

Inspired by the vim extension [Tabular.vim](https://github.com/godlygeek/tabular).

## Features

- Align text based on arbitrary delimiter patterns (specified at invocation).
- Left, center, right align, with optional padding before the delimiter.
- Preserves leading indentation.

## How to use

1. Place cursor within the block of text you want to align.
2. Trigger `Tabular Aligner` action via command palette.
3. Enter the delimiter as a regex (some characters need to be escaped).
4. Enter a format specifier (or leave empty).

If not using an explicit selection, the extension will align all lines around
the cursor that contains the delimiter.

## Format specifier

Format specifier pattern: `[lcr][0-9]+`

The first letter specifies whether a cell is left, center, or right aligned. The
subsequent number is how many additional spaces of padding to insert between
this item and the next item.

Multiple format specifiers can be specified, in which case each item (field or
delimiter) will use the next format specifier, looping around the specifiers if
there are more fields than format specifiers.