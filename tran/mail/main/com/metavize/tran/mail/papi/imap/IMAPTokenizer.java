/*
 * Copyright (c) 2004 Metavize Inc.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * Metavize Inc. ("Confidential Information").  You shall
 * not disclose such Confidential Information.
 *
 * $Id$
 */
package com.metavize.tran.mail.papi.imap;
import static com.metavize.tran.util.Ascii.*;
import static com.metavize.tran.util.ASCIIUtil.*;
import com.metavize.tran.util.BBTokenizer;
import java.nio.ByteBuffer;

/**
 * Class to tokenize a chain of ByteBuffers.  Does
 * not modify the Buffers it visits.
 * <br><br>
 * This class works by calling {@link #next next}
 * with each ByteBuffer of data until {@link #IMAPNextResult NEED_MORE_DATA}
 * is returned.  Note that the IMAPTokenizer is designed
 * to work with the TAPI, in that it can return NEED_MORE_DATA
 * with data remaining in the ByteBuffer.  It is expected that this
 * data will be retuned (along with more data) on any subsquent call
 * to {@link #next next}.  This is a form of pushback.  Since all that
 * is pushed-back are incomplete tokens, the maximum amount of data which
 * is pushed-back is defined as the {@link #getLongestWord longest word},
 * which defaults to 2048.
 * <br><br>
 * Said another way, instances of IMAPTokenizer maintain state only about
 * the current token, not candidate tokens.  This is handy in that callers
 * may choose to perform their own parsing of the ByteBuffer once a given
 * token is encountered.  The Tokenizer when then "pick-up" where ever
 * the ByteBuffer is positioned (note that it is then implicit that
 * the character at the buffer's position -1 was a delimiter).
 * <br><br>
 * Instances of IMAPTokenizer are stateful (obviously not
 * threadsafe).  After each call to {@link #next next}, the
 * {@link #getTokenType token type}, its
 * {@link #getTokenStart starting position} within the buffer,
 * and its {@link #getTokenLength length within the buffer}
 * are set.  Since each call to {@link #next next} advances the
 * position of the buffer (provided the result of {@link #next next}
 * is not NEED_MORE_DATA), the start/length are used to derefference
 * the just-encountered token.  This design is a bit harder to use
 * than returning the actual tokens from each call to {@link #next next},
 * but avoids creating zillions of little objects 99% of which will be
 * ignored.
 * <br><br>
 * There are two more specialized methods for accessing information about
 * the just-encountered token.
 * <ul>
 * <li>{@link getLiteralOctetCount getLiteralOctetCount}
 * returns the number of octets from an IMAP LITERAL (see RFC 3501 Section 4.3).
 * RFC 3501 defines a "LITERAL" in the form <code>{nnn}CRLF</code> where
 * <code>nnn</code> is the number of octets following the CRLF of the octet
 * declaration.  The EOL (CRLF, CR, or LF in this implementation) is <b>not</b>
 * included in the count.  Note that when a {@link #IMAPTT LITERAL} token
 * is encountered, the buffer is advanced past the EOL to the first byte
 * of the octet sequence.   Since LITERALS can contain any characters (including
 * control characters and EOL), callers must "advance" the ByteBuffer chain
 * the number of octets declared by the literal before calling
 * {@link #next next} again.
 * </li>
 * <li>{@link #getQStringToken getQStringToken} returns a QString token
 * (see RFC 3501 section 4.3).  The QString token is stripped of its
 * leading/trailing quotes (&#34), and any internally escaped quotes
 * (&#92&#34) are replaced with quotes.  I'm not sure from reading rfc3501 is
 * quote-escaping is legal (UW Imap Server seems to use a LITERAL any time
 * text contains a quote) but I'm assuming <i>someone</i> out there assumed
 * it was legal and likely does it.
 * </li>
 * </ul>
 */
public class IMAPTokenizer {

  private static final int DEF_LONGEST_WORD = 1024*2;

  private static final byte[] BLANK_BYTES = new byte[0];

  private static final byte[] DELIMS = new byte[] {
    HT_B,
    SP_B,
    CR_B,
    LF_B,
    OPEN_BRACKET_B,//[
    CLOSE_BRACKET_B,//]
    OPEN_BRACE_B,//{
    CLOSE_BRACE_B,//}
    OPEN_PAREN_B,//(
    CLOSE_PAREN_B,//)    
    QUOTE_B,
    BACK_SLASH_B,
    PLUS_B,
    STAR_B
  };

  private static final byte[] EXCLUDE_DELIMS = new byte[] {
    HT_B,
    SP_B,
  };
  
  private static final byte[] QUOTE_DELIMS = new byte[] {
    QUOTE_B,
    BACK_SLASH_B
  };   

  /**
   * Enumeration of the various TokenTypes
   */
  public enum IMAPTT {
    /**
     * A simple Word, defined as a sequence of
     * characters bounded by delimiters and not taking
     * the form of a QSTRING or LITERAL definition
     */
    WORD,
    /**
     * A quoted String (see RFC 3501 Section 4.3)
     */
    QSTRING,
    /**
     * A literal declaration (see RFC 3501 Section 4.3)
     */    
    LITERAL,
    /**
     * A control delimiter, which also has significance.  These
     * are as follows:
     * <ul>
     * <li>[</li>
     * <li>]</li>
     * <li>{</li>
     * <li>}</li>
     * <li>(</li>
     * <li>)</li>
     * <li>&#34</li>
     * <li>&#92</li>
     * <li>*</li>
     * <li>+</li>
     * </ul>
     * Other delimiters such as spaces are not significant.  EOL charaters
     * are significant, but returned via their own token (NEW_LINE).
     */
    CONTROL_CHAR,
    /**
     * A new line (CR, LF, CRLF)
     */
    NEW_LINE,
    /**
     * Placeholder for when there is no token type
     */
    NONE
  };

  /**
   * Enum of the results from
   * a call to next
   */
  public enum IMAPNextResult {
    HAVE_TOKEN,
    EXCEEDED_LONGEST_WORD,
    NEED_MORE_DATA
  };


  private BBTokenizer m_tokenizer;
  private IMAPTT m_tt = IMAPTT.NONE;
  private int m_start = -1;
  private int m_len = -1;
  
  private int m_literalOctetCount = 0;

  public IMAPTokenizer() {
    m_tokenizer = new BBTokenizer();
    m_tokenizer.setLongestWord(DEF_LONGEST_WORD);
    m_tokenizer.setDelims(DELIMS, EXCLUDE_DELIMS);
  }


//==================================
// Properties  
//==================================

  /**
   * Set the longest word.  If, while tokenizing,
   * a word is being scanned and is found to be longer
   * than this value, the return of
   * {@link #IMAPNextResult EXCEEDED_LONGEST_WORD}
   * will be returned.
   *
   * @param longestWord the longest word (in bytes)
   */
  public void setLongestWord(int longestWord) {
    m_tokenizer.setLongestWord(longestWord);
  }
  public int getLongestWord() {
    return m_tokenizer.getLongestWord();
  }

//=====================================
// Stateful Method about current token  
//=====================================
  
  /**
   * If the type is QSTRING, the begin/end quotes
   * <b>are</b> included in the count (i.e.
   * {@link #getTokenStart the token start index is a quote}
   * as is the {@link #getTokenLength token length}).
   * <br><br>
   * Also, the tokenizer did skip-over slash-escaped quotes,
   * but did <b>not</b> modify the buffer (i.e. if the QString is
   * to be used, it must have its leading/trailing quotes stripped
   * as well as any embedded escaped quotes).  To get the "proper"
   * QString token, use {@link #getQStringToken getQStringToken}.
   */
  public IMAPTT getTokenType() {
    return m_tt;
  }

  /**
   * Get the offset within the {@link #next ByteBuffer just scanned}
   * of the current token.  This is inclusive (i.e. if this
   * value is 5 and the {@link #getTokenLength length} is 2, then
   * the token occupies indecies 5 and 6 of the ByteBuffer).
   *
   * @return the token start, or undefined if there is
   *         no current token.
   */
  public int getTokenStart() {
    return m_start;
  }

  /**
   * Get the length of the current token.  This is
   * 1 when the {@link #getTokenType type}
   * is CONTROL_CHAR, zero for a LITERAL token,
   * and the length of the String for a WORD.  If the type
   * is QSTRING, this is <b>inclusive</b> of the open/close
   * quote ({@link #getQStringToken see getQStringToken}).
   * <br><br>
   * If there is no current token, this value is undefined.
   *
   * @return the length of the current token
   */
  public int getTokenLength() {
    return m_len;
  }

  /**
   * Debugging method which returns a reasonable String
   * representation for the current token.
   */
  public String tokenToStringDebug(ByteBuffer buf) {
    switch(m_tt) {
      case WORD:
        ByteBuffer dup = buf.duplicate();
        dup.position(getTokenStart());
        dup.limit(dup.position() + getTokenLength());
        return bbToString(dup);
      case QSTRING:
        return new String(getQStringToken(buf));
      case LITERAL:
        return new String("<literal> " + getLiteralOctetCount());
      case CONTROL_CHAR:
        return asciiByteToString(buf.get(getTokenStart()));
      case NEW_LINE:
        return "<EOL>";
      case NONE:
        return "<NONE>";
    }
    throw new RuntimeException("Unknown Token type: " + m_tt);
  }
  
  /**
   * Only if {@link getTokenType the token type} is LITERAL, this defines
   * the number of octets (bytes) of that literal.  Note also that the
   * position of the buffer has been moved beyond the CRLF which defined
   * the literal in the form <code>{NNN}CRLF</code>
   *
   * @return the literal octet count, provided the current
   *         {@link #getTokenType token type} is {@link #IMAPTT LITERAL}.
   *         
   */
  public int getLiteralOctetCount() {
    return m_literalOctetCount;
  }

  /**
   * If the current token is of type QSTRING, this is the String without
   * the leading/trailing quotes as well as any internal
   * escaped quoted fixed.
   *
   * @param bb the Buffer just passed to {@link #next next}
   *
   * @return QString token without quotes.
   */
  public byte[] getQStringToken(ByteBuffer bb) {
    int next = 0;
    byte[] ret = new byte[getTokenLength()-2];
    for(int i = 1; i<getTokenLength()-1; i++) {
      if(bb.get(getTokenStart() + i) == BACK_SLASH_B &&
        bb.limit() < bb.get(getTokenStart() + i + 1) &&
        bb.get(getTokenStart() + i + 1) == QUOTE_B) {
        i++;
      }
      ret[next++] = bb.get(getTokenStart() + i);
    }
    if(next < ret.length) {
      byte[] newRet = new byte[next];
      System.arraycopy(ret, 0, newRet, 0, next);
      ret = newRet;
    }
    return ret;
  }

  

//=======================================
// Token Consumption methods  
//=======================================

  /**
   * Advance this ByteBuffer to the next token.  If
   * {@link #IMAPNextResult HAVE_TOKEN} is returned,
   * then the {@link #getTokenType getTokenType},
   * {@link #getTokenStart getTokenStart}, and
   * {@link #getTokenLength getTokenLength} methods will return
   * information about the just-encountered token.  The ByteBuffer
   * is advanced just-past the token.
   * <br><br>
   * If the return is {@link #IMAPNextResult NEED_MORE_DATA}, then 
   * up to {@link getLongestWord the longest word}-1 number of bytes may
   * be left in the buffer.  Any incomplete tokens are left in the buffer,
   * and duplicate scanning repeats in the subsequent call to
   * {@link #next next}.
   * <br><br>
   * If the return is {@link #IMAPNextResult EXCEEDED_LONGEST_WORD}, the
   * caller must either {@link #setLongestWord increase the longest word},
   * or abandon tokenizing as this will always be returned.
   * <br><br>
   * Values for the token start, type, and length are undefined 
   * for the NEED_MORE_DATA and EXCEEDED_LONGEST_WORD returns.
   *
   * @param bb the ByteBuffer to be tokenized
   *
   * @return the result
   */
  public IMAPNextResult next(ByteBuffer bb) {
    //Reset token type
    reset();

    //Get next token
    BBTokenizer.NextResult nextResult = m_tokenizer.next(bb);

    switch(nextResult) {
      case NEED_MORE_DATA:
        m_tt = IMAPTT.NONE;
        return IMAPNextResult.NEED_MORE_DATA;
      case EXCEEDED_LONGEST_WORD:
        m_tt = IMAPTT.NONE;
        return IMAPNextResult.EXCEEDED_LONGEST_WORD;
      case HAVE_DELIM:
        //The delim can mean a few things
        return processDelim(bb);
      case HAVE_WORD:
        m_tt = IMAPTT.WORD;
        m_start = m_tokenizer.tokenStart();
        m_len = m_tokenizer.tokenLength();
        return IMAPNextResult.HAVE_TOKEN;
    }
    throw new RuntimeException(
      "Fell from a switch which should have been inclusive");
  }

  /**
   * Resets the Token properties to invalid values
   */
  private void reset() {
    m_tt = IMAPTT.NONE;
    m_start = -1;
    m_len = -1;    
  }

  /**
   * Helper method to process a delimiter.
   */
  private IMAPNextResult processDelim(ByteBuffer bb) {
    switch(bb.get(m_tokenizer.tokenStart())) {
      //The simple delim-as-tokens.  Note that SP and HT are never returned
      case OPEN_BRACKET_B:
      case CLOSE_BRACKET_B:
      case OPEN_PAREN_B:
      case CLOSE_PAREN_B:            
      case PLUS_B:
      case STAR_B:
      case BACK_SLASH_B:
        //I'm very unclear from the lame IMAP spec if
        //  \" encountered bare should indicate an
        //escape of a QString.  I'll assume "no"
      case CLOSE_BRACE_B:        
        m_tt = IMAPTT.CONTROL_CHAR;
        m_start = m_tokenizer.tokenStart();
        m_len = m_tokenizer.tokenLength();
        return IMAPNextResult.HAVE_TOKEN;
      case OPEN_BRACE_B:
        return processOpenBrace(bb);
      case CR_B:
        if(!bb.hasRemaining()) {
          bb.position(bb.position()-1);
          m_tt = IMAPTT.NONE;
          return IMAPNextResult.NEED_MORE_DATA;          
        }
        if(bb.get() == LF_B) {
          m_tt = IMAPTT.NEW_LINE;
          m_start = bb.position()-2;
          m_len = 2;
          return IMAPNextResult.HAVE_TOKEN;           
        }
        else {
          //Rewind the get
          bb.position(bb.position()-1);
          m_tt = IMAPTT.NEW_LINE;
          m_start = bb.position()-1;
          m_len = 1;
          return IMAPNextResult.HAVE_TOKEN;            
        }
      case LF_B:
        m_tt = IMAPTT.NEW_LINE;
        m_start = m_tokenizer.tokenStart();
        m_len = 1;
        return IMAPNextResult.HAVE_TOKEN;        
      case QUOTE_B:
        int quoteStart = m_tokenizer.tokenStart();
        bb.position(quoteStart+1);
        //Search for the quote end, or the end of the buffer.
        //TODO Should new line determine the implicit end of a broken quote?
        while(bb.hasRemaining()) {
          byte b = bb.get();
          //Check for too long
          if((bb.position() - quoteStart) > m_tokenizer.getLongestWord()) {
            bb.position(quoteStart);
            m_tt = IMAPTT.NONE;
            return IMAPNextResult.EXCEEDED_LONGEST_WORD;            
          }
          if(b == BACK_SLASH_B) {
            //Either grab the escaped character, or let
            //us fall through to request more bytes
            if(bb.hasRemaining()) {
              bb.get();
            }
            continue;
          }
          if(b == QUOTE_B) {
            //we're done
            m_tt = IMAPTT.QSTRING;
            m_start = quoteStart;
            m_len = bb.position()-m_start;
            return IMAPNextResult.HAVE_TOKEN;
          }
        }
        //Fell through.  Reset and request more bytes
        bb.position(quoteStart);
        m_tt = IMAPTT.NONE;
        return IMAPNextResult.NEED_MORE_DATA;
    }
    throw new RuntimeException(
      "Fell from a swithc which should have been inclusive");
  }

  /**
   * Helper method to process an open brace delimiter ("{"),
   * which may begin a LITERAL declaration.
   */
  private IMAPNextResult processOpenBrace(ByteBuffer bb) {

    //Test:
    //{{
    //{EOF
    //{nEOF
    //{n EOF
    //{ nEOF
    //{nn}EOF
    //{nn}CREOF
    //{nn}LFEOF
    //{nn}CRLFEOF
    //{nn}CRLFxx
    //{xEOF
    
    //Note the start.  We may have to re-wind to this
    //punt if we cannot complete this literal
    int braceStart = m_tokenizer.tokenStart();

    BBTokenizer.NextResult nextResult = m_tokenizer.next(bb);
    switch(nextResult) {
    
      case NEED_MORE_DATA:
        //Re-wind the buffer so next time we re-encounter the brace
        //Test {EOF
        bb.position(braceStart);
        m_tt = IMAPTT.NONE;
        return IMAPNextResult.NEED_MORE_DATA;
        
      case EXCEEDED_LONGEST_WORD:
        //Leave { consumed and rewind this "too long" word
        //so we encounter the "longest-word" thing next
        bb.position(braceStart);
        m_tt = IMAPTT.CONTROL_CHAR;
        return IMAPNextResult.HAVE_TOKEN;
        
      case HAVE_DELIM:
        //Re-wind to we re-encounter the token
        //we just consumed next time.  Test "{{"
        bb.position(m_tokenizer.tokenStart());
        m_start = braceStart;
        m_len = 1;
        m_tt = IMAPTT.CONTROL_CHAR;
        return IMAPNextResult.HAVE_TOKEN;
    }

    //If we're here, then we have a word.  Check
    //if the word is all numbers (permit LWS)
    for(int i = 0; i<m_tokenizer.tokenLength(); i++) {
      if(!(isNumber(bb.get(m_tokenizer.tokenStart() + i)) ||
        isLWS(bb.get(m_tokenizer.tokenStart() + i)))) {
        //Not a number.  Rewind it and return later
        //as a simple WORD
        bb.position(m_tokenizer.tokenStart());
        m_start = braceStart;
        m_len = 1;        
        m_tt = IMAPTT.CONTROL_CHAR;
        return IMAPNextResult.HAVE_TOKEN;        
      }
    }
    
    //Parse the number
    int octetCount = 0;
    try {
      ByteBuffer dup = bb.duplicate();
      dup.position(m_tokenizer.tokenStart());
      dup.limit(dup.position() + m_tokenizer.tokenLength());
      String octetString = bbToString(dup);
      octetString.trim();
      octetCount = Integer.parseInt(octetString);
    }
    catch(Exception ex) {
      ex.printStackTrace(System.out);//TODO bscott removeme
      //TODO bscott log this
      bb.position(m_tokenizer.tokenStart());
      m_start = braceStart;
      m_len = 1;
      m_tt = IMAPTT.CONTROL_CHAR;
      return IMAPNextResult.HAVE_TOKEN;
    }

    //Consume any whitespace
    eatWhitespace(bb, false);
    
    //We have a {NNN   Check for
    //a } then CRLF
    if(bb.remaining() < 2) {
      //Rewind such that we re-encounter the "{NNN" next time
      bb.position(braceStart);
      m_tt = IMAPTT.NONE;
      return IMAPNextResult.NEED_MORE_DATA;
    }
    if(bb.get() == CLOSE_BRACE) {
      //Check for the CRLF
      if(bb.get(bb.position()) == CR_B) {
        bb.get();
        if(bb.remaining() < 1) {
          //Need more bytes to check for new line
          bb.position(braceStart);
          m_tt = IMAPTT.NONE;
          return IMAPNextResult.NEED_MORE_DATA;          
        }
        if(bb.get() != LF_B) {
          bb.position(bb.position()-1);                    
        }
        m_start = bb.position();
        m_len = 0;
        m_literalOctetCount = octetCount;
        m_tt = IMAPTT.LITERAL;
        return IMAPNextResult.HAVE_TOKEN;          
      }
      else if(bb.get(bb.position()) == LF_B) {
        //Bare LF.  Naughty, naughty, naughty
        bb.position(bb.position()+1);
        m_start = bb.position();
        m_len = 0;
        m_literalOctetCount = octetCount;
        m_tt = IMAPTT.LITERAL;
        return IMAPNextResult.HAVE_TOKEN;        
      }
      else {
        //Odd.  Did not comply
        bb.position(braceStart+1);
        m_start = braceStart;
        m_len = 1;          
        m_tt = IMAPTT.CONTROL_CHAR;
        return IMAPNextResult.HAVE_TOKEN;         
      }
    }
    else {
      //Not a candidate
      bb.position(braceStart+1);
      m_start = braceStart;
      m_len = 1;      
      m_tt = IMAPTT.CONTROL_CHAR;
      return IMAPNextResult.HAVE_TOKEN;      
    }
  }


  
}