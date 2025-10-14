export type HtmlNode =
  | { type: "text"; value: string }
  | { type: "open"; name: string; raw: string }
  | { type: "close"; name: string; raw: string };

const enum ParserState {
  Data,
  TagOpen,
  TagName,
  CloseTag,
}

export function parseHtml(input: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  let state = ParserState.Data;
  let textBuffer = "";
  let tagBuffer = "";
  let tagName = "";

  const flushText = () => {
    if (textBuffer.length === 0) {
      return;
    }
    nodes.push({ type: "text", value: textBuffer });
    textBuffer = "";
  };

  for (let index = 0; index < input.length; index++) {
    const char = input[index];

    switch (state) {
      case ParserState.Data: {
        if (char === "<") {
          flushText();
          state = ParserState.TagOpen;
          tagBuffer = "<";
          tagName = "";
        } else {
          textBuffer += char;
        }
        break;
      }
      case ParserState.TagOpen: {
        if (char === "/") {
          tagBuffer += char;
          state = ParserState.CloseTag;
          tagName = "";
        } else if (isTagNameStartChar(char)) {
          tagBuffer += char;
          tagName = char;
          state = ParserState.TagName;
        } else {
          textBuffer += tagBuffer + char;
          tagBuffer = "";
          tagName = "";
          state = ParserState.Data;
        }
        break;
      }
      case ParserState.TagName: {
        if (char === ">") {
          const raw = tagBuffer + ">";
          nodes.push({
            type: "open",
            name: tagName.toLowerCase(),
            raw,
          });
          tagBuffer = "";
          tagName = "";
          state = ParserState.Data;
        } else if (isTagNameChar(char)) {
          tagBuffer += char;
          tagName += char;
        } else {
          textBuffer += tagBuffer + char;
          tagBuffer = "";
          tagName = "";
          state = ParserState.Data;
        }
        break;
      }
      case ParserState.CloseTag: {
        if (char === ">") {
          const raw = tagBuffer + ">";
          nodes.push({
            type: "close",
            name: tagName.toLowerCase(),
            raw,
          });
          tagBuffer = "";
          tagName = "";
          state = ParserState.Data;
        } else if (isTagNameChar(char)) {
          tagBuffer += char;
          tagName += char;
        } else {
          textBuffer += tagBuffer + char;
          tagBuffer = "";
          tagName = "";
          state = ParserState.Data;
        }
        break;
      }
    }
  }

  if (state === ParserState.TagOpen) {
    textBuffer += tagBuffer;
  } else if (state === ParserState.TagName || state === ParserState.CloseTag) {
    textBuffer += tagBuffer;
  }

  flushText();
  return nodes;
}

function isLetter(char: string) {
  const code = char.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isDigit(char: string) {
  const code = char.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function isTagNameStartChar(char: string) {
  return isLetter(char);
}

function isTagNameChar(char: string) {
  return isLetter(char) || isDigit(char) || char === "-";
}
