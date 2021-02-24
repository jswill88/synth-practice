import ButtonLabel from './ButtonLabel'
import { Context } from '../context/context'
import { useContext } from 'react'
import { Row, Button, Divider, Col } from 'antd';

export default function NoteColumns() {
  const {
    // Tone,
    currentBeat,
    NOTES,
    // makeSynth,
    loopLength,
    noteSwitches,
    // setNoteSwitches,
    // prog
  } = useContext(Context)

  // useEffect(() => {
  //   const synth = makeSynth('chordSynth');
  //   const loop = new Tone.Sequence((time, note) => {
  //     // if (type === 'snareDrum') synth.triggerAttackRelease('8n', time)
  //     /*else*/ synth.triggerAttackRelease(note, '8n', time)
  //   }, noteSwitches['high']).start(0);

  //   return () => {
  //     loop.cancel()
  //     loop.dispose();
  //   }

  // }, [Tone.Sequence, makeSynth, noteSwitches])

  const addSynth = (beat, note, row) => {
    console.log(noteSwitches[row].events)
    if (!noteSwitches[row].events[beat].length) {


      console.log('in if')
      noteSwitches[row].events[beat] = note;
      // const arrLoop = new Array(loopLength).fill([])
      // arrLoop[beat] = note;

      // let type;
      // if (['bassHigh', 'bassLow'].includes(row)) type = 'bassSynth'
      // else if (['high', 'mid', 'low'].includes(row)) type = 'chordSynth'
      // else type = row;
      // const synth = makeSynth(type);

      // const loop = new Tone.Sequence((time, note) => {
      //   if (type === 'snareDrum') synth.triggerAttackRelease('8n', time)
      //   else synth.triggerAttackRelease(note, '8n', time)
      // }, arrLoop).start(0);


      // /********************* */
      // console.log(loop.events)
      // loop.events[0] = 'Ab5'
      // console.log(loop.events)
      /*********************** */

      // const newLoopForRow = noteSwitches[row];

      // newLoopForRow[beat] = note;

      // setNoteSwitches(obj => {
      //   return { ...obj, [row]: newLoopForRow }
      // });
    } else {
      // noteSwitches[row][beat].stop();
      // noteSwitches[row][beat].cancel();
      // setNoteSwitches(obj => ({ ...obj, [row]: { ...obj[row], [beat]: false } }));
      noteSwitches[row].events[beat] = []
    }
  }

  const getNote = (noteRow, i) => {
    let note;
    if (['bassDrum', 'snareDrum', 'cymbal'].includes(noteRow)) {
      note = NOTES[noteRow][Math.floor(i / loopLength * 4)];
    } else {
      note = NOTES[noteRow][Math.floor(i / loopLength * 4)] + (noteRow.includes('bass') ? 3 : 5);
    }
    return note;
  }

  const getNoteName = (noteRow, i) => {
    let noteName;
    if (['bassDrum', 'snareDrum', 'cymbal'].includes(noteRow)) {
      noteName = noteRow[0].toUpperCase() + (noteRow === 'cymbal' ? '' : 'D');
    } else {
      noteName = NOTES[noteRow][Math.floor(i / loopLength * 4)]
    }
    return noteName;
  }

  // const columns = [];

  const chordLength = i => {
    let start = i * loopLength / 4;
    const end = start + loopLength / 4;
    const chordLength = [];
    for (; start < end; start++) chordLength.push(start)
    return chordLength
  }

  // columns.push(
  return (
    <>
      {[0, 1, 2, 3].map(i =>
        < Col
          // title={prog[i]}
          // type="inner"
          key={i}
          style={{
            marginBottom: '1rem',
            // boxShadow: '.1rem .1rem .2rem grey'
          }}
        >
          {Object.keys(noteSwitches).map((noteRow, j) =>
            <Row
              key={j}
            >
              {/* {Object.keys(noteSwitches[noteRow])
                .filter((beat) => beat >= i * loopLength / 4 && beat < i * loopLength / 4 + loopLength / 4) */}
              {chordLength(i).map(beat =>
                <Button
                  shape="circle"
                  onClick={() => {
                    const note = getNote(noteRow, beat)
                    addSynth(beat, note, noteRow)
                  }}
                  key={beat}
                  style={{ overflow: 'hidden' }}
                >
                  {/* <Text>{currentBeat}</Text> */}
                  {noteSwitches[noteRow].events[beat] &&

                    <ButtonLabel
                      beat={noteSwitches[noteRow].events[beat]}
                      active={String(beat) === String(currentBeat)}
                      note={getNoteName(noteRow, beat)}
                    />
                    
                  }
                  </Button>
              )}
              {['low', 'bassLow'].includes(noteRow) && <Divider />}
            </Row>
          )}
        </Col>
      )}
      {/* <Divider 
        type="vertical"
        style={{ backgroundColor: 'black'}}
        /> */}
    </>
  )
  // )
  // return columns;

}