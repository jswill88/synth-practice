import { useContext, useState } from 'react';
import { Context } from '../context/context';

import Button from 'antd/es/button';
import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import InputNumber from 'antd/es/input-number';
import Form from 'antd/es/form';
import Tooltip from 'antd/es/tooltip';
import Row from 'antd/es/row';
import Col from 'antd/es/col'

import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined'

const { Option } = Select;
const { Text } = Typography

export default function Controls() {
  const {
    isMobile,
  } = useContext(Context);
  return (
    <>
      {isMobile ?
        <>
          <Row>
            <LoopLength />
          </Row>
          <Row
            justify="space-between"
            align="middle"
          style={{ height: '42px' }}
          >
            <Col
              span={24}
              // style={{ backgroundColor: 'white' }}
            >
              <TempoSetter />
            </Col>
          </Row>
        </>
        :
        <>
          <LoopLength />
          <TempoSetter />
        </>
      }
    </>
  )
}


function LoopLength() {
  const {
    loopLength,
    reset,
    setLoopLength
  } = useContext(Context)

  return (
    <>
      <Text>
        Length&nbsp;
        <Tooltip
          title="Changes how many beats are in the loop. Changing the loop length will discard all progress"
          placement="bottom"
        >
          <QuestionCircleOutlined
            style={{ color: 'rgba(0, 0, 0, 0.45)' }}
          />
        </Tooltip>&nbsp;:&nbsp;
        </Text>

      <Select
        title="test"
        size="small"
        value={loopLength}
        onChange={val => {
          reset(true);
          setLoopLength(parseInt(val));
        }}
        style={{ marginRight: '1rem' }}
      >
        {[8, 12, 16, 20, 24].map((beats, i) =>
          <Option
            key={i}
            value={beats}
          >
            {beats}
          </Option>
        )}
      </Select>
    </>
  )
}

function TempoSetter() {
  const {
    tempo,
    handleTempoChange,
    isMobile
  } = useContext(Context)

  const [editTempo, setEditTempo] = useState(false);
  const [tempoError, setTempoError] = useState(false);

  const [form] = Form.useForm();

  const updateTempo = async () => {
    try {
      const { tempo } = await form.validateFields();
      handleTempoChange(tempo)
      setEditTempo(false)
    } catch (e) {
      console.log(e)
    }
  }

  const checkTempoErrors = async () => {
    try {
      const { tempo } = await form.validateFields();
      if (!/^\d+$/.test(tempo) || tempo < 50 || tempo > 320) setTempoError(true)
      else setTempoError(false)
    } catch (e) {
      console.log(e)
    }
  }

  return (
    <Form
      layout="inline"
      component="span"
      colon
      form={form}
    // labelCol={{span: 10}}
    style={{ flexWrap: 'nowrap', height: '100%' }}
    >


      <Form.Item
        label="BPM&nbsp;"
        name="tempo"
        tooltip={{
          title: "Enter a number between 50 and 320",
          placement: "bottom"
        }}
        validateStatus={tempoError ? 'error' : 'success'}
        initialValue={tempo}
        // labelCol={{span: 1}}
        // wrapperCol={{span: 3}}
        style={isMobile && {flexWrap: 'nowrap', width: '3rem'}}
        >

        {!editTempo ?
          <Text
            editable
            onClick={() => setEditTempo(true)}
          >
            {tempo}
          </Text>
        :

        
          <InputNumber
          size="small"
          onChange={() => checkTempoErrors()}
          style={{width: isMobile && '5rem'}}
          />
        }
      </Form.Item>
        

      {editTempo &&
        <>
          <Form.Item>
            <Button
              size="small"
              onClick={() => updateTempo()}
              style={{marginLeft: isMobile && '5rem'}}
            >
              Set
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              size="small"
              onClick={() => {
                setEditTempo(false)
                form.resetFields();
              }}
            >
              Cancel
            </Button>
          </Form.Item>
        </>
      }
    </Form>
  )
}