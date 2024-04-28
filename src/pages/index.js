"use client";
import { useState } from "react";
import { MessageBox, Input, Button } from "react-chat-elements";
import { useDebounce } from "use-debounce";

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const MODEL_NAME = "gemini-1.0-pro";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const system_instruction = `__ASK__
-Ante cualquiera pregunta o saludo, vas a preguntar por el nombre del usuario primero. Si te indica el nombre desde el saludo, continua con la segunda respuesta. Ejemplo:
¿Cómo te llamas?

-Solo insistirás al usuario cuando no entregue un nombre.
Ejemplo:
Es necesario que me digas tu nombre.

-Vas a responder con este saludo si el usuario dió su nombre, sino, sigue insistiendo por el nombre:
-Solo usarás este ejemplo cuando el nombre sea masculino => ¡{nombre del usuario} cuec, le gusta los hombres cuec!
En que te puedo ayudar en el día de hoy con tus preguntas?
-Solo usará este ejemplo cuando el nombre sea femenino => ¡{nombre del usuario} cuec, le gusta las mujeres cuec!
En que te puedo ayudar en el día de hoy con tus preguntas?

Cualquier preguntan que te haga vas a responder con algo gracioso.

__CONSTRAINT__
-Todo nombre debe iniciar en mayusculas, no importa si el usuario lo escribió en minusculas.
-El nombre del usuario no puede ser Alexis, le vas a pedir que use otro nombre.
-Una vez que el usuario haya insertado su nombre, no lo puedes cambiar.
-Cuando el usuario deja su nombre y esta mal escribo, corrigelo.
Ejemplo:
miugek => Miguel.
-El resultado me lo vas a entregar en formato texto.

__CONTEXT__
-Eres un chatbot cool, con el nombre Pepe.
-Este es un chat gracioso con amigos, no tienes que preocuparte por la formalidad, puedes hacer bromas y molestarlos.
-Habrá momento donde el usuario se pone a decir cosas insultantes, trata de responderme con el mismo tono sin meter a la familia.`;

export default function Home() {
  const [userMsg, setUserMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([
    {
      role: "user",
      parts: [{ text: system_instruction }],
    },
    {
      role: "model",
      parts: [{ text: "Entendido!" }],
    },
  ]);
  const [userMsgDebounced] = useDebounce(userMsg, 200);
  const handleButtonClick = () => {
    if (!userMsg) {
      return;
    }
    runChat();
    setUserMsg("");
  };
  const handleInputChange = (e) => {
    setUserMsg(e.target.value.trim());
  };
  const handleKeyUp = (e) => {
    if (!userMsgDebounced) {
      return;
    }
    if (e.key === "Enter") {
      runChat();
      setUserMsg("");
    }
  };

  async function runChat() {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: history,
    });

    const result = await chat.sendMessageStream(userMsgDebounced);
    let text = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      text += chunkText;
    }
    setMessages([
      ...messages,
      {
        title: "Yo",
        text: userMsgDebounced,
        position: "right",
      },
      {
        title: "El Pepe",
        text: text,
        position: "left",
      },
    ]);
    let userPrompt = {
      role: "user",
      parts: [{ text: userMsgDebounced }],
    };

    let aiResponse = {
      role: "model",
      parts: [{ text: text }],
    };

    setHistory([...history, userPrompt, aiResponse]);
  }

  return (
    <div className="w-full flex flex-col items-center">
      <h1 className="mt-12">Chatea con el PEPE</h1>
      <div className="mt-12 max-w-96">
        <div
          id="chatScreen"
          className="border-2 shadow-md max-h-96 min-w-80 min-h-40 border-zinc-50 p-4 rounded-md overflow-y-auto text-black space-y-3"
        >
          {messages.map((message, index) => (
            <MessageBox
              key={index}
              title={message.title}
              position={message.position}
              text={message.text}
              type="text"
            />
          ))}
        </div>
        <div className="flex relative mt-3">
          <Input
            className="relative"
            placeholder="mensaje..."
            value={userMsg}
            maxlength={100}
            autofocus={true}
            inputStyle={{ color: "white", padding: "15px" }}
            onChange={handleInputChange}
            onKeyUp={handleKeyUp}
          />
          <Button
            text="enviar"
            className="absolute right-0 top-[7%]"
            onClick={handleButtonClick}
          />
        </div>
      </div>
    </div>
  );
}
