"""Independent, tabular comparison matching spreadsheet SUMIFS with two selectors."""
import json, sqlite3
from pathlib import Path
rows=json.loads(Path(__file__).resolve().parents[1].joinpath("src/corpus.json").read_text())
db=sqlite3.connect(":memory:")
db.execute("create table logs(id primary key, firstImpact, firstUrgency, recordedPriority, lastImpact, lastUrgency, lastPriority)")
db.executemany("insert into logs values (?,?,?,?,?,?,?)", rows)
query="""select
sum(firstImpact = ? and firstUrgency = ?),
sum(lastImpact = ? and lastUrgency = ?),
sum((firstImpact = ? and firstUrgency = ?) and not (lastImpact = ? and lastUrgency = ?)),
sum((lastImpact = ? and lastUrgency = ?) and not (firstImpact = ? and firstUrgency = ?))
from logs"""
for cell,expected in [(("Medium","High"),(210,257,17,64)),(("High","High"),(185,270,58,143))]:
    totals=db.execute(query,cell*6).fetchone()
    assert totals==expected, (cell,totals)
    print(cell,"first / last / first-only / last-only",totals)

