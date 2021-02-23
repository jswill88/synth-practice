import { createContext, useEffect, useState } from 'react';
import useFetch from '../hooks/ajax'
import axios from 'axios';
import * as Tone from 'tone';
import { BASS, CHORDS } from '../lib/noteInfo';
import { SYNTHS, synthTypes } from '../lib/synthInfo';
import { message } from 'antd';
import StartAudioContext from 'startaudiocontext';

export const Context = createContext();
const audioContext = new AudioContext();

function ContextProvider(props) {
  const [prog, setProg] = useState(['I', 'V', 'vi', 'IV'])
  const [tempo, setTempo] = useState(120);
  const [title, setTitle] = useState('New Song')
  const [noteSwitches, setNoteSwitches] = useState({});
  const [loopLength, setLoopLength] = useState(12);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState('');
  const [songs, setSongs] = useState([]);
  const [degrees, setDegrees] = useState(70);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [openSongId, setOpenSongId] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [playStatus, setPlayStatus] = useState('stop');

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


  useEffect(() => {
    // StartAudioContext(new Tone.Context());
    // StartAudioContext(audioContext)
   
    const checkLoggedIn = async () => {
      const result = await axios.get(process.env.REACT_APP_URL + '/api/v1/loggedIn')
      console.log(result)
      if (result.data) {
        setSongs(result.data.songList);
        setUser(result.data.username);
        setLoggedIn(true);
      }
    }
    checkLoggedIn();

  }, []);

  useEffect(() => {
    const noteObj = {
      high: {}, mid: {}, low: {}, bassHigh: {}, bassLow: {}, cymbal: {}, snareDrum: {}, bassDrum: {}
    }
    for (let note in noteObj) {
      for (let i = 0; i < loopLength; i++) noteObj[note][i] = false;
    }
    setNoteSwitches(noteObj)

    const loop = new Tone.Loop(time => {
      Tone.Draw.schedule(() => {
        setCurrentBeat(beat => (beat + 1) % loopLength)
      }, time)
    }, '8n').start('+0.1');

    return () => loop.cancel();
  }, [loopLength])

  const signIn = async (userData) => {
    const result = await fetchApi('/signin', 'post', userData)
    console.log(result)
    if (!result.error) {
      console.log('success')
      setLoggedIn(true)
      setUser(result.data.username);
      setSongs(result.data.songs);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const signUp = async (userData) => {
    const result = await fetchApi('/signup', 'post', userData);
    if (!result.error) {
      setLoggedIn(true)
      setUser(userData.username);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const logout = async () => {
    const result = await fetchApi('/logout', 'get')
    if (!result.error) {
      setLoggedIn(false)
      setUser('')
      setSongs([])
      setOpenSongId(false)
      setTitle('New Song')
      reset();
    } else {
      message.error(result.message)
      return 'error';
    }
  }
  /**
   * 
   * @param {String} type Should be 'new' or 'update'
   */
  const saveSong = async (type, newTitle) => {
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
      title: newTitle || title,
      buttonsPressed: noteObj,
      bpm: tempo,
      numberOfBeats: loopLength,
      chordProgression: prog,
    }
    const result = await fetchApi(
      type === 'update' ? '/update' : '/save',
      type === 'update' ? 'put' : 'post',
      songObj)

    if (!result.error) {
      if (type === 'new') {
        setSongs(arr => [...arr, result.data])
        setOpenSongId(result.data.id)
        setTitle(result.data.title)
      }
      message.success(`${result.data.title} successfully saved`)
      return 'success'
    } else {
      message.error(result.message)
      return 'error';
    }
  }

  const newSong = async () => {
    const result = await fetchApi('/close', 'get')
    if (!result.error) {
      reset();
      setOpenSongId(false);
      handleTempoChange(120);
      setDegrees(70);
      setProg(['I', 'V', 'vi', 'IV']);
      const titles = songs.map(({ title }) => title)
      let newTitle = 'New Song'
      let i = 1;
      while (titles.includes(newTitle)) {
        newTitle = `New Song ${i}`;
        i++;
      }

      setTitle(newTitle);
      return 'success';
    } else {
      message.error(result.message)
      return 'error';
    }

  }

  const open = async (songId) => {
    // stopAudio()
    const result = await fetchApi('/open', 'post', { songId })
    if (!result.error) {
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
      message.error(result.message)
      return 'error';
    }
  }

  const handleChordChange = (newChord, i) => {
    setProg(arr => {
      const arrCopy = [...arr]
      arrCopy[i] = newChord;
      return arrCopy;
    });

    const start = i * loopLength / 4;
    const end = start + loopLength / 4
    setNoteSwitches(noteObj => {
      for (let noteRow in noteObj) {

        if (['high', 'mid', 'low', 'bassHigh', 'bassLow'].includes(noteRow)) {
          for (let i = start; i < end; i++) {
            if (noteObj[noteRow][i]) {
              noteObj[noteRow][i].stop('+0.1');
              noteObj[noteRow][i].cancel('+0.2');
              noteObj[noteRow][i].dispose('+0.3');
              const arrLoop = new Array(loopLength).fill([])

              let note;
              if (['bassLow', 'bassHigh'].includes(noteRow)) {
                note = BASS[newChord][noteRow === 'bassLow' ? 0 : 1] + 3;
              } else {
                note = CHORDS[newChord][2 - Object.keys(NOTES).indexOf(noteRow)] + 5;
              }

              arrLoop[i] = note;

              const synth = makeSynth(noteRow.includes('bass') ? 'bassSynth' : 'chordSynth');
              noteObj[noteRow][i] = new Tone.Sequence((time, note) => {
                synth.triggerAttackRelease(note, '16n', time);
              }, arrLoop).start('+0.1');
            }
          }
        }
      }
      return noteObj;
    })
  }

  const rename = async newTitle => {
    if (songs.length) {
      let songInList = songs.filter(({ title: titleInList }) => titleInList === title)
      if (songInList.length) {
        const { id: songId } = songInList[0];
        const result = await fetchApi('/rename', 'patch', { newTitle, songId });
        if (result.error) {
          message.error(result.message)
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
    if (!result.error) {
      reset();
      setSongs(arr => arr.filter(({ id }) => id !== openSongId))
      setOpenSongId(false);
      setTitle('Untitled');
      handleTempoChange(120);
      setDegrees(70);
      setProg(['I', 'V', 'vi', 'IV']);
      message.success(`${result.data.title} successfullly deleted`)
      return 'success';
    } else {
      message.error(result.message)
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
          }, arrLoop).start('+0.1');
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

    return buttonsPressed;
  }

  const handleTempoChange = newTempo => {
    const tempo = newTempo < 50 ? 50 : Math.min(320, newTempo)
    Tone.Transport.bpm.value = tempo;
    setTempo(tempo)
  }

  const reset = (skip) => {
    Tone.Transport.stop('+0.1');
    for (let loop in noteSwitches) {
      for (let i = 0; i < loopLength; i++) {
        if (noteSwitches[loop][i]) {
          noteSwitches[loop][i].stop()
          noteSwitches[loop][i].cancel()
          noteSwitches[loop][i].dispose()
        }
      }
    }
    
    if (!skip) {
      const noteObj = {
        high: {}, mid: {}, low: {}, bassHigh: {}, bassLow: {}, cymbal: {}, snareDrum: {}, bassDrum: {}
      }
      for (let note in noteObj) {
        for (let i = 0; i < loopLength; i++) noteObj[note][i] = false;
      }
      setNoteSwitches(noteObj)
    }
    setPlayStatus('stop')
    setCurrentBeat(-1)
  }


  // const stopAudio = () => {
  //   setPlayStatus('stop')
  //   Tone.Transport.stop()
  //   setCurrentBeat(-2);
  // }

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
    deleteSong,
    newSong,
    showForm,
    setShowForm,
    playStatus,
    setPlayStatus,
    handleChordChange,
    // stopAudio
  }

  return (
    <Context.Provider value={state}>
      {props.children}
    </Context.Provider>
  )
}
export default ContextProvider;
