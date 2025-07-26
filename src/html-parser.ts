import type { MessageEntity } from "./deps.deno.ts";
import { consolidateEntities } from "./util.ts";

/**
 * Parser state machine states for HTML token parsing
 */
enum ParserState {
  TEXT_MODE = "TEXT_MODE",
  TAG_START = "TAG_START", 
  OPEN_TAG_NAME = "OPEN_TAG_NAME",
  CLOSE_TAG_NAME = "CLOSE_TAG_NAME",
  TAG_END = "TAG_END"
}

/**
 * Supported HTML tags mapped to MessageEntity types
 */
const HTML_TAG_MAPPING: Record<string, MessageEntity["type"]> = {
  'b': 'bold',
  'strong': 'bold',
  'i': 'italic',
  'em': 'italic',
  'u': 'underline',
  's': 'strikethrough',
  'del': 'strikethrough'
};

/**
 * Warning types for HTML parsing issues
 */
export enum HTMLParseWarningType {
  UNCLOSED_TAG = "UNCLOSED_TAG",
  ORPHANED_CLOSING_TAG = "ORPHANED_CLOSING_TAG", 
  UNSUPPORTED_TAG = "UNSUPPORTED_TAG",
  MALFORMED_TAG = "MALFORMED_TAG",
  INVALID_NESTING = "INVALID_NESTING"
}

/**
 * Warning object for HTML parsing issues
 */
export interface HTMLParseWarning {
  type: HTMLParseWarningType;
  message: string;
  position?: number;
  tagName?: string;
}

/**
 * Result object from HTML parsing
 */
export interface HTMLParseResult {
  rawText: string;
  rawEntities: MessageEntity[];
  warnings: HTMLParseWarning[];
}

/**
 * Entity stack item for tracking open tags
 */
interface EntityStackItem {
  type: MessageEntity["type"];
  tagName: string;
  startOffset: number;
  position: number; // Position in original HTML where tag started
}

/**
 * Core HTML parser class implementing token-by-token parsing
 */
export class HTMLParser {
  private html: string = "";
  private position: number = 0;
  private state: ParserState = ParserState.TEXT_MODE;
  private currentTagName: string = "";
  private isClosingTag: boolean = false;
  private rawText: string = "";
  private entityStack: EntityStackItem[] = [];
  private completedEntities: MessageEntity[] = [];
  private warnings: HTMLParseWarning[] = [];

  /**
   * Parses HTML string and returns FormattedString-compatible result
   * @param html The HTML string to parse
   * @returns Parse result with rawText, rawEntities, and warnings
   */
  parse(html: string): HTMLParseResult {
    this.reset();
    this.html = html;

    while (this.position < this.html.length) {
      const char = this.html[this.position];
      this.processCharacter(char);
      this.position++;
    }

    // Handle end of input
    this.handleEndOfInput();

    // Consolidate entities and return result
    const consolidatedEntities = consolidateEntities(this.completedEntities);

    return {
      rawText: this.rawText,
      rawEntities: consolidatedEntities,
      warnings: [...this.warnings]
    };
  }

  /**
   * Resets parser state for new parsing operation
   */
  private reset(): void {
    this.position = 0;
    this.state = ParserState.TEXT_MODE;
    this.currentTagName = "";
    this.isClosingTag = false;
    this.rawText = "";
    this.entityStack = [];
    this.completedEntities = [];
    this.warnings = [];
  }

  /**
   * Processes a single character based on current parser state
   */
  private processCharacter(char: string): void {
    switch (this.state) {
      case ParserState.TEXT_MODE:
        this.handleTextMode(char);
        break;
      case ParserState.TAG_START:
        this.handleTagStart(char);
        break;
      case ParserState.OPEN_TAG_NAME:
        this.handleOpenTagName(char);
        break;
      case ParserState.CLOSE_TAG_NAME:
        this.handleCloseTagName(char);
        break;
      case ParserState.TAG_END:
        this.handleTagEnd(char);
        break;
    }
  }

  /**
   * Handles character processing in TEXT_MODE state
   */
  private handleTextMode(char: string): void {
    if (char === '<') {
      this.state = ParserState.TAG_START;
      this.currentTagName = "";
      this.isClosingTag = false;
    } else {
      // Regular text character - add to output
      this.rawText += char;
    }
  }

  /**
   * Handles character processing in TAG_START state
   */
  private handleTagStart(char: string): void {
    if (char === '/') {
      this.isClosingTag = true;
      this.state = ParserState.CLOSE_TAG_NAME;
    } else if (this.isValidTagNameStart(char)) {
      this.currentTagName = char.toLowerCase();
      this.state = ParserState.OPEN_TAG_NAME;
    } else {
      // Invalid tag start - treat as literal text
      this.addWarning(HTMLParseWarningType.MALFORMED_TAG, "Invalid tag start character", this.position - 1);
      this.rawText += '<' + char;
      this.state = ParserState.TEXT_MODE;
    }
  }

  /**
   * Handles character processing in OPEN_TAG_NAME state
   */
  private handleOpenTagName(char: string): void {
    if (this.isValidTagNameChar(char)) {
      this.currentTagName += char.toLowerCase();
    } else if (char === '>') {
      this.processOpenTag();
      this.state = ParserState.TEXT_MODE;
    } else if (this.isWhitespace(char)) {
      // We don't support attributes - treat as malformed tag
      this.addWarning(HTMLParseWarningType.MALFORMED_TAG, `Tags with attributes not supported: ${this.currentTagName}`, this.position);
      this.rawText += '<' + this.currentTagName + char;
      this.state = ParserState.TAG_END; // Continue to skip until >
    } else {
      // Invalid character in tag name
      this.addWarning(HTMLParseWarningType.MALFORMED_TAG, `Invalid character in tag name: ${char}`, this.position);
      this.rawText += '<' + this.currentTagName + char;
      this.state = ParserState.TEXT_MODE;
    }
  }

  /**
   * Handles character processing in CLOSE_TAG_NAME state
   */
  private handleCloseTagName(char: string): void {
    if (this.isValidTagNameChar(char)) {
      this.currentTagName += char.toLowerCase();
    } else if (char === '>') {
      this.processCloseTag();
      this.state = ParserState.TEXT_MODE;
    } else if (this.isWhitespace(char)) {
      this.state = ParserState.TAG_END;
    } else {
      // Invalid character in closing tag name
      this.addWarning(HTMLParseWarningType.MALFORMED_TAG, `Invalid character in closing tag name: ${char}`, this.position);
      this.rawText += '</' + this.currentTagName + char;
      this.state = ParserState.TEXT_MODE;
    }
  }

  /**
   * Handles character processing in TAG_END state (skipping to >)
   */
  private handleTagEnd(char: string): void {
    if (char === '>') {
      // Since we're in TAG_END state, this tag had attributes which we don't support
      // Warning was already added when we detected the attributes, just output the >
      this.rawText += '>';
      this.state = ParserState.TEXT_MODE;
    } else {
      // Continue adding characters as literal text
      this.rawText += char;
    }
  }

  /**
   * Processes an opening tag
   */
  private processOpenTag(): void {
    const entityType = HTML_TAG_MAPPING[this.currentTagName];
    
    if (!entityType) {
      // Unsupported tag - treat as plain text
      this.addWarning(HTMLParseWarningType.UNSUPPORTED_TAG, `Unsupported tag: ${this.currentTagName}`, this.position - this.currentTagName.length - 1);
      this.rawText += '<' + this.currentTagName + '>';
      return;
    }

    // Add to entity stack
    this.entityStack.push({
      type: entityType,
      tagName: this.currentTagName,
      startOffset: this.rawText.length,
      position: this.position - this.currentTagName.length - 1
    });
  }

  /**
   * Processes a closing tag
   */
  private processCloseTag(): void {
    const entityType = HTML_TAG_MAPPING[this.currentTagName];
    
    if (!entityType) {
      // Unsupported closing tag - treat as plain text
      this.addWarning(HTMLParseWarningType.UNSUPPORTED_TAG, `Unsupported closing tag: ${this.currentTagName}`, this.position - this.currentTagName.length - 2);
      this.rawText += '</' + this.currentTagName + '>';
      return;
    }

    // Find matching open tag in stack
    const matchIndex = this.findMatchingOpenTag(entityType, this.currentTagName);
    
    if (matchIndex === -1) {
      // Orphaned closing tag
      this.addWarning(HTMLParseWarningType.ORPHANED_CLOSING_TAG, `Closing tag without matching opening tag: ${this.currentTagName}`, this.position - this.currentTagName.length - 2);
      this.rawText += '</' + this.currentTagName + '>';
      return;
    }

    // Handle overlapping tags by auto-closing and re-opening
    this.handleOverlappingTags(matchIndex);
  }

  /**
   * Finds matching open tag in entity stack
   */
  private findMatchingOpenTag(entityType: MessageEntity["type"], tagName: string): number {
    // Look for exact tag name match first
    for (let i = this.entityStack.length - 1; i >= 0; i--) {
      if (this.entityStack[i].tagName === tagName) {
        return i;
      }
    }

    // If no exact match, look for same entity type (for <b>/<strong> equivalence)
    for (let i = this.entityStack.length - 1; i >= 0; i--) {
      if (this.entityStack[i].type === entityType) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Handles overlapping tags with auto-close and re-open logic
   */
  private handleOverlappingTags(matchIndex: number): void {
    const currentOffset = this.rawText.length;
    
    // Auto-close all tags after the matching tag (in reverse order)
    const autoClosedTags: EntityStackItem[] = [];
    
    for (let i = this.entityStack.length - 1; i > matchIndex; i--) {
      const tag = this.entityStack[i];
      
      // Only create entity if it has content
      if (currentOffset > tag.startOffset) {
        this.completedEntities.push({
          type: tag.type,
          offset: tag.startOffset,
          length: currentOffset - tag.startOffset
        } as MessageEntity);
      }
      
      autoClosedTags.unshift(tag); // Add to front to maintain order for re-opening
    }

    // Close the matching tag
    const matchedTag = this.entityStack[matchIndex];
    if (currentOffset > matchedTag.startOffset) {
      this.completedEntities.push({
        type: matchedTag.type,
        offset: matchedTag.startOffset,
        length: currentOffset - matchedTag.startOffset
      } as MessageEntity);
    }

    // Remove closed tags from stack (everything from matchIndex onwards)
    this.entityStack = this.entityStack.slice(0, matchIndex);

    // Re-open auto-closed tags with new start positions
    for (const tag of autoClosedTags) {
      this.entityStack.push({
        type: tag.type,
        tagName: tag.tagName,
        startOffset: currentOffset,
        position: tag.position
      });
    }
  }

  /**
   * Handles end of input - auto-close any remaining open tags
   */
  private handleEndOfInput(): void {
    // Handle incomplete tag at end
    if (this.state !== ParserState.TEXT_MODE) {
      this.addWarning(HTMLParseWarningType.MALFORMED_TAG, "Incomplete tag at end of input", this.position);
      
      // Add the incomplete tag as literal text
      let literalText = '<';
      if (this.isClosingTag) literalText += '/';
      literalText += this.currentTagName;
      this.rawText += literalText;
    }

    // Auto-close remaining open tags
    const currentOffset = this.rawText.length;
    
    while (this.entityStack.length > 0) {
      const tag = this.entityStack.pop()!;
      
      this.addWarning(HTMLParseWarningType.UNCLOSED_TAG, `Unclosed tag: ${tag.tagName}`, tag.position);
      
      // Create entity for unclosed tag
      this.completedEntities.push({
        type: tag.type,
        offset: tag.startOffset,
        length: currentOffset - tag.startOffset
      } as MessageEntity);
    }
  }

  /**
   * Adds a warning to the warnings collection
   */
  private addWarning(type: HTMLParseWarningType, message: string, position?: number, tagName?: string): void {
    this.warnings.push({
      type,
      message,
      position,
      tagName
    });
  }

  /**
   * Checks if character is valid for starting a tag name
   */
  private isValidTagNameStart(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  /**
   * Checks if character is valid within a tag name
   */
  private isValidTagNameChar(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char);
  }

  /**
   * Checks if character is whitespace
   */
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }
}

/**
 * Parses HTML string and returns FormattedString-compatible result
 * @param html The HTML string to parse
 * @returns Parse result with rawText, rawEntities, and warnings
 */
export function parseHTML(html: string): HTMLParseResult {
  const parser = new HTMLParser();
  return parser.parse(html);
}

/**
 * Quick function to parse HTML and return just text and entities (no warnings)
 * @param html The HTML string to parse
 * @returns Object with rawText and rawEntities for FormattedString constructor
 */
export function parseHTMLToFormattedStringData(html: string): { rawText: string; rawEntities: MessageEntity[] } {
  const result = parseHTML(html);
  return {
    rawText: result.rawText,
    rawEntities: result.rawEntities
  };
}

/**
 * Validates if an HTML string is safe and well-formed for parsing
 * @param html The HTML string to validate
 * @returns Object with isValid flag and any validation warnings
 */
export function validateHTML(html: string): { isValid: boolean; warnings: HTMLParseWarning[] } {
  const result = parseHTML(html);
  
  // Consider HTML valid if it has no critical errors
  const criticalWarnings = result.warnings.filter(w => 
    w.type === HTMLParseWarningType.MALFORMED_TAG
  );
  
  return {
    isValid: criticalWarnings.length === 0,
    warnings: result.warnings
  };
}