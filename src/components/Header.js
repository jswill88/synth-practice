import { useContext } from 'react';
import { Context } from '../context/context';
import SignInForm from './SignInForm';
import './Header.css'

import { Row, Col, Typography, Button } from 'antd';

const { Title } = Typography;

export default function Heading() {

  const {
    // saveSong,
    logout,
    // user,
    loggedIn,
    // openSongId,
    // newSong,
    setShowForm
  } = useContext(Context);

  return (
    <Row
      className="header"
      justify="space-between"
      align="middle"
    >
      <Col span={6}
      >
        <Title
          level={2}
          style={{
            color: '#FFFFFF',
            margin: 0,
            fontFamily: '\'Sniglet\', cursive'
          }}
        >
          🎂 Cake Mix
        </Title>
      </Col>
      <>
        <Col
        span={3}
        >
          {!loggedIn ?
            <>
              <Button
                style={{ width: '100%' }}
                type="primary"
                onClick={() => {
                  setShowForm(true)
                }}
              >
                Sign In
            </Button>
              <SignInForm />
            </>
            :
            <Button
              style={{ width: '100%' }}
              type="primary"
              onClick={() => {
                logout();
              }
              }
            >
              Log Out
            </Button>
          }
        </Col>
      </>
    </Row>
  )
}