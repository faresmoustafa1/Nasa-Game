# Saved real NASA data

Empty on purpose until Step 5.

Step 5 downloads real records from the official NASA APIs listed in
`../sources.json` and saves them here, each with the date it was fetched.
The game uses these files only when the live API does not answer within
1.5 seconds. When it does, the screen says "SAVED REAL NASA DATA (from <date>)",
never "LIVE".

Do not hand-write data into these files. Every value must come from a real
NASA response.
