# Interactive Brokers Instruments

## Purpose
Document how ETF instruments are searched, matched, and normalized for the portfolio layer.

## Requirements
- Search ETFs by symbol, ISIN when available, and text query.
- Capture exchange, currency, conid/security identifiers, and safe display name.
- Normalize fields before portfolio logic consumes them.
