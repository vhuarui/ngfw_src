/*
 * Copyright (c) 2004, 2005 Metavize Inc.
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of
 * Metavize Inc. ("Confidential Information").  You shall
 * not disclose such Confidential Information.
 *
 * $Id$
 */

package com.metavize.mvvm.client;

public class InvocationConnectionException extends InvocationException {
    public InvocationConnectionException() { super(); }
    public InvocationConnectionException(String message) { super(message); }
    public InvocationConnectionException(String message, Throwable cause)
    {
        super(message, cause);
    }

    public InvocationConnectionException(Throwable cause) { super(cause); }
}
