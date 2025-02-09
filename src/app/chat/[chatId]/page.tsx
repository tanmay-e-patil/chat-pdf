import React from 'react'

type Props = {
    params: {
        chatId: string
    }
}

const Chat = ({params: {chatId}}: Props) => {
  return (
    <div>{chatId}</div>
  )
}

export default Chat