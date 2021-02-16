import { createContext, useEffect, useState } from 'react';
import useFetch from '../hooks/ajax'
import * as Tone from 'tone';
import { BASS, CHORDS } from '../lib/noteInfo';
import { SYNTHS, synthTypes } from '../lib/synthInfo';

export const Context = createContext();

function LoginProvider(props) {
  const [prog, setProg] = useState(['I', 'V', 'vi', 'IV'])
  const [tempo, setTempo] = useState(120);
  const [title, setTitle] = useState('Untitled')
  const [noteSwitches, setNoteSwitches] = useState({});
  const [loopLength, setLoopLength] = useState(12);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState('');
  const [songs, setSongs] = useState([]);
  const [degrees, setDegrees] = useState(70);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [openSongId, setOpenSongId] = useState(false);

  const fetchApi = useFetch();

  const makeSynth = type => new Tone[synthTypes[type]](SYNTHS[type]).toDestination();

  const NOTES = {
    high: [CHORDS[prog[0]][2], CHORDS[prog[1]][2], CHORDS[prog[2]][2], CHORDS[prog[3]][2]],
    mid: [CHORDS[prog[0]][1], CHORDS[prog[1]][1], CHORDS[prog[2]][1], CHORDS[prog[3]][1]],
    low: [CHORDS[prog[0]][0], CHORDS[prog[1]][0], CHORDS[prog[2]][0], CHORDS[prog[3]][0]],
    bassHigh: [BASS[prog[0]][1], BASS[prog[1]][1], BASS[prog[2]][1], BASS[prog[3]][1]],
    bassLow: [BASS[prog[0]][0], BASS[prog[1]][0], BASS[prog[2]][0], BASS[prog[3]][0]],
    cymbal: ['C1', 'C1', 'C1', 'C1'],
    snareDrum: ['', '', '', ''],
    bassDrum: ['C1', 'C1', 'C1', 'C1'],
  }

  const signIn = async (userData) => {
    const result = await fetchApi('/signin', 'post', userData)

    if (result !== 'error') {
      setLoggedIn(true)
      setUser(result.data.username);
      setSongs(result.data.songs);
      return 'success';
    } else {
      return 'error';
    }
  }

  const signUp = async (userData) => {
    const result = await fetchApi('/signup', 'post', userData);
    if (result !== 'error') {
      setLoggedIn(true)
      setUser(userData.username);
      return 'success';
    } else {
      return 'error';
    }
  }

  const logout = async () => {
    const result = await fetchApi('/logout', 'get')
    if (result !== 'error') {
      setLoggedIn(false)
      setUser('')
      setSongs([])
      setOpenSongId(false)
    } else {
      return 'error';
    }
  }

  const saveSong = async () => {
    const noteObj = {};
    for (let row in noteSwitches) {
      noteObj[row] = {}
      for (let beat in noteSwitches[row]) {
        if (!noteSwitches[row][beat])
          noteObj[row][beat] = false;
        else noteObj[row][beat] = true;
      }
    }

    const songObj = {
      title: title,
      buttonsPressed: noteObj,
      bpm: tempo,
      numberOfBeats: loopLength,
      chordProgression: prog,
    }
    const result = await fetchApi('/save', 'post', songObj)

    if (result !== 'error') {
      setSongs(arr => [...arr, result.data])
      setOpenSongId(result.data.id)
      return 'success'
    } else {
      return 'error';
    }
  }

  const open = async (songId) => {
    const result = await fetchApi('/open', 'post', { songId })
    if (result !== 'error') {
      const { data: songObj } = result
      setProg(songObj.chordProgression);
      reset(true);
      handleTempoChange(songObj.bpm)
      setDegrees(songObj.bpm - 50)
      setLoopLength(songObj.numberOfBeats);
      setTitle(songObj.title)
      setOpenSongId(songObj._id)
      setNoteSwitches(updateButtons(songObj));

      return 'success'
    } else {
      return 'error';
    }
  }

  useEffect(() => console.log('note switches use effect', noteSwitches), [noteSwitches])
  

  const rename = async newTitle => {
    if (songs.length) {
      let songInList = songs.filter(({ title: titleInList }) => titleInList === title)
      if (songInList.length) {
        const { id: songId } = songInList[0];
        const result = await fetchApi('/rename', 'patch', { newTitle, songId });
        if (result === 'error') {
          return 'error';
        } else {
          setTitle(result.data.newTitle)
          setSongs(songs => {
            return [...songs.map((song, { id }) => {
              if (id === songId) {
                return { id, title: newTitle }
              }
              else return song;
            })];
          })
        }
      } else {
        setTitle(newTitle);
      }
    } else {
      setTitle(newTitle);
    }

  }

  const deleteSong = async () => {
    const result = await fetchApi('/deletesong', 'delete', {
      songIdToDelete: openSongId
    })
    if (result !== 'error') {
      reset();
      setSongs(arr => arr.filter(({ id }) => id !== openSongId))
      setOpenSongId(false);
      setTitle('Untitled');
      handleTempoChange(120);
      setDegrees(70);
      setProg(['I', 'V', 'vi', 'IV']);
      return 'success';
    } else {
      return 'error'
    }
  }

  const updateButtons = ({ chordProgression, buttonsPressed, numberOfBeats }) => {
    let chord = 0;
    const numPerChord = numberOfBeats / 4;
    let counter = 0
    for (let noteRow in buttonsPressed) {
      for (let i = 0; i < numberOfBeats; i++) {
        if (buttonsPressed[noteRow][i]) {
          console.log(buttonsPressed[noteRow][i])
          const arrLoop = new Array(numberOfBeats).fill([])
          let note;
          if (['bassDrum', 'snareDrum', 'cymbal'].includes(noteRow)) {
            note = NOTES[noteRow][0];
          } else if (['bassLow', 'bassHigh'].includes(noteRow)) {
            note = BASS[chordProgression[chord]][noteRow === 'bassLow' ? 0 : 1] + 3;
          } else {
            note = CHORDS[chordProgression[chord]][2 - Object.keys(NOTES).indexOf(noteRow)] + 5;
          }

          arrLoop[i] = note;

          let type;
          if (['bassHigh', 'bassLow'].includes(noteRow)) type = 'bassSynth'
          else if (['high', 'mid', 'low'].includes(noteRow)) type = 'chordSynth'
          else type = noteRow;



          const synth = makeSynth(type);
          buttonsPressed[noteRow][i] = new Tone.Sequence((time, note) => {
            if (type === 'snareDrum') synth.triggerAttackRelease('8n', time)
            else synth.triggerAttackRelease(note, '8n', time)
          }, arrLoop).start(0);
        }
        counter++;
        if (counter >= numPerChord) {
          chord++;
          counter = 0;
        }
      }
      chord = 0;
      counter = 0;
    }
    console.log('buttons pressed', buttonsPressed)
    // setNoteSwitches(buttonsPressed);
    return buttonsPressed;
  }

  const handleTempoChange = newTempo => {
    const tempo = newTempo < 50 ? 50 : Math.min(350, newTempo)
    Tone.Transport.bpm.value = tempo;
    setTempo(tempo)
  }

  const reset = (skip) => {
    for (let loop in noteSwitches) {
      for (let i = 0; i < loopLength; i++) {
        if (noteSwitches[loop][i]) {
          noteSwitches[loop][i].stop()
          noteSwitches[loop][i].cancel()
          noteSwitches[loop][i].dispose()
        }
      }
    }
    Tone.Transport.stop();
    if(!skip) {
      const noteObj = {
        high: {}, mid: {}, low: {}, bassHigh: {}, bassLow: {}, cymbal: {}, snareDrum: {}, bassDrum: {}
      }
      for (let note in noteObj) {
        for (let i = 0; i < loopLength; i++) noteObj[note][i] = false;
      }
      setNoteSwitches(noteObj)
    }
    setCurrentBeat(-2)
  }

  const state = {
    loggedIn,
    signIn,
    signUp,
    logout,
    saveSong,
    songs,
    user,
    noteSwitches,
    setNoteSwitches,
    prog,
    setProg,
    loopLength,
    setLoopLength,
    tempo,
    setTempo,
    open,
    handleTempoChange,
    Tone,
    degrees,
    setDegrees,
    title,
    setTitle,
    currentBeat,
    setCurrentBeat,
    reset,
    NOTES,
    makeSynth,
    rename,
    openSongId,
    deleteSong
  }

  return (
    <Context.Provider value={state}>
      {props.children}
    </Context.Provider>
  )
}
export default LoginProvider