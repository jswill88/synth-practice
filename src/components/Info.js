import Typography from 'antd/es/typography'

const { Title, Link, Paragraph } = Typography;

export default function Info() {

  return (
    <>
      <Title level={2}>About</Title>
      <Paragraph>
        If you enjoy music applications, please also check out the{' '}
        <Link href="https://polyrhythmgenerator.netlify.app/">Polyrhythm Generator</Link>.
      </Paragraph>
      <Title level={2}>Controls</Title>
      <Title level={4}>Main Buttons</Title>
      <Title level={4}>BPM</Title>
      <Title level={4}>Length</Title>
      <Title level={4}>Chord Progression</Title>
    </>
  )
}