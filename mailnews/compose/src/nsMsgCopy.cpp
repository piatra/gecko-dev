/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */
#include "nsXPIDLString.h"
#include "nsMsgCopy.h"
#include "nsIPref.h"
#include "nsIMsgCopyService.h"
#include "nsMsgBaseCID.h"
#include "nsIMsgMailSession.h"
#include "nsMsgFolderFlags.h"
#include "nsIMsgFolder.h"
#ifdef MSCOTT_IMPLEMENTED_NEWURI_FOR_IMAP
#include "nsIURI.h"
#include "nsIIOService.h" 
#else
#include "nsIURL.h"
#endif /* MSCOTT_IMPLEMENTED_NEWURI_FOR_IMAP */
#include "nsMsgComposeStringBundle.h"

#define ANY_SERVER "anyfolder://"

#ifdef MSCOTT_IMPLEMENTED_NEWURI_FOR_IMAP
static NS_DEFINE_CID(kIOServiceCID, NS_IOSERVICE_CID);
#else
static NS_DEFINE_CID(kStandardUrlCID, NS_STANDARDURL_CID);
#endif /* MSCOTT_IMPLEMENTED_NEWURI_FOR_IMAP */
static NS_DEFINE_CID(kMsgCopyServiceCID,NS_MSGCOPYSERVICE_CID);
static NS_DEFINE_CID(kCMsgMailSessionCID, NS_MSGMAILSESSION_CID); 

////////////////////////////////////////////////////////////////////////////////////
// This is the listener class for the copy operation. We have to create this class 
// to listen for message copy completion and eventually notify the caller
////////////////////////////////////////////////////////////////////////////////////
// RICHIE SHERRY NS_IMPL_ISUPPORTS(CopyListener, nsCOMTypeInfo<nsIMsgCopyServiceListener>::GetIID());
NS_IMPL_ADDREF(CopyListener);
NS_IMPL_RELEASE(CopyListener);
NS_IMPL_QUERY_INTERFACE(CopyListener,nsCOMTypeInfo<nsIMsgCopyServiceListener>::GetIID());

CopyListener::CopyListener(void) 
{ 
  mComposeAndSend = nsnull;
  NS_INIT_REFCNT(); 
}

CopyListener::~CopyListener(void) 
{
}

nsresult
CopyListener::OnStartCopy()
{
#ifdef NS_DEBUG
  printf("CopyListener::OnStartCopy()\n");
#endif

  if (mComposeAndSend)
    mComposeAndSend->NotifyListenersOnStartCopy();
  return NS_OK;
}
  
nsresult
CopyListener::OnProgress(PRUint32 aProgress, PRUint32 aProgressMax)
{
#ifdef NS_DEBUG
  printf("CopyListener::OnProgress() %d of %d\n", aProgress, aProgressMax);
#endif

  if (mComposeAndSend)
    mComposeAndSend->NotifyListenersOnProgressCopy(aProgress, aProgressMax);

  return NS_OK;
}

nsresult
CopyListener::SetMessageKey(PRUint32 aMessageKey)
{
    if (mComposeAndSend)
        mComposeAndSend->SetMessageKey(aMessageKey);
    return NS_OK;
}

nsresult
CopyListener::GetMessageId(nsCString* aMessageId)
{
    if (mComposeAndSend)
        mComposeAndSend->GetMessageId(aMessageId);
    return NS_OK;
}

nsresult
CopyListener::OnStopCopy(nsresult aStatus)
{
  if (NS_SUCCEEDED(aStatus))
  {
#ifdef NS_DEBUG
    printf("CopyListener: SUCCESSFUL ON THE COPY OPERATION!\n");
#endif
  }
  else
  {
#ifdef NS_DEBUG
    printf("CopyListener: COPY OPERATION FAILED!\n");
#endif
  }

  if (mComposeAndSend)
    mComposeAndSend->NotifyListenersOnStopCopy(aStatus);

  return NS_OK;
}

nsresult
CopyListener::SetMsgComposeAndSendObject(nsMsgComposeAndSend *obj)
{
  if (obj)
    mComposeAndSend = obj;

  return NS_OK;
}

////////////////////////////////////////////////////////////////////////////////////
// END  END  END  END  END  END  END  END  END  END  END  END  END  END  END 
// This is the listener class for the copy operation. We have to create this class 
// to listen for message copy completion and eventually notify the caller
////////////////////////////////////////////////////////////////////////////////////

NS_IMPL_ISUPPORTS(nsMsgCopy, nsMsgCopy::GetIID());

nsMsgCopy::nsMsgCopy()
{
  mCopyListener = nsnull;
  mFileSpec = nsnull;
  mMode = nsMsgDeliverNow;
  mSavePref = nsnull;

  NS_INIT_REFCNT(); 
}

nsMsgCopy::~nsMsgCopy()
{
  PR_FREEIF(mSavePref);
}

nsresult
nsMsgCopy::StartCopyOperation(nsIMsgIdentity       *aUserIdentity,
                              nsIFileSpec          *aFileSpec, 
                              nsMsgDeliverMode     aMode,
                              nsMsgComposeAndSend  *aMsgSendObj,
                              const char           *aSavePref,
                              nsIMessage           *aMsgToReplace)
{
  nsCOMPtr<nsIMsgFolder>  dstFolder;
  PRBool                  isDraft = PR_FALSE;

  if (!aMsgSendObj)
    return NS_ERROR_INVALID_ARG;

  // Store away the server location...
  if (aSavePref)
    mSavePref = PL_strdup(aSavePref);

  //
  // Vars for implementation...
  //
  if (aMode == nsMsgQueueForLater)       // QueueForLater (Outbox)
  {
    dstFolder = GetUnsentMessagesFolder(aUserIdentity);
    isDraft = PR_FALSE;
    if (!dstFolder) {
        return NS_MSG_UNABLE_TO_SEND_LATER;
    } 
  }
  else if (aMode == nsMsgSaveAsDraft)    // SaveAsDraft (Drafts)
  {
    dstFolder = GetDraftsFolder(aUserIdentity);
    isDraft = PR_TRUE;
    if (!dstFolder) {
	return NS_MSG_UNABLE_TO_SAVE_DRAFT;
    } 
  }
  else if (aMode == nsMsgSaveAsTemplate) // SaveAsTemplate (Templates)
  {
    dstFolder = GetTemplatesFolder(aUserIdentity);
    isDraft = PR_FALSE;
    if (!dstFolder) {
	return NS_MSG_UNABLE_TO_SAVE_TEMPLATE;
    } 
  }
  else // SaveInSentFolder (Sent) -  nsMsgDeliverNow
  {
    dstFolder = GetSentFolder(aUserIdentity);
    isDraft = PR_FALSE;
    if (!dstFolder) {
	return NS_MSG_COULDNT_OPEN_FCC_FOLDER;
    }
  }

  mMode = aMode;
  nsresult rv = DoCopy(aFileSpec, dstFolder, aMsgToReplace, isDraft, nsnull, aMsgSendObj);
  return rv;
}

nsresult 
nsMsgCopy::DoCopy(nsIFileSpec *aDiskFile, nsIMsgFolder *dstFolder,
                  nsIMessage *aMsgToReplace, PRBool aIsDraft,
                  nsITransactionManager *txnMgr,
                  nsMsgComposeAndSend   *aMsgSendObj)
{
  nsresult rv = NS_OK;

  // Check sanity
  if ((!aDiskFile) || (!dstFolder))
    return NS_ERROR_INVALID_ARG;

	//Call copyservice with dstFolder, disk file, and txnManager
	NS_WITH_SERVICE(nsIMsgCopyService, copyService, kMsgCopyServiceCID, &rv); 
	if(NS_SUCCEEDED(rv))
	{
    CopyListener    *tPtr = new CopyListener();
    if (!tPtr)
      return NS_ERROR_OUT_OF_MEMORY;

    mCopyListener = do_QueryInterface(tPtr);
    if (!mCopyListener)
      return NS_ERROR_OUT_OF_MEMORY;

    mCopyListener->SetMsgComposeAndSendObject(aMsgSendObj);
    rv = copyService->CopyFileMessage(aDiskFile, dstFolder, aMsgToReplace,
                                      aIsDraft, mCopyListener, txnMgr);
	}

	return rv;
}

nsIMsgFolder *
nsMsgCopy::GetUnsentMessagesFolder(nsIMsgIdentity   *userIdentity)
{
  return LocateMessageFolder(userIdentity, nsMsgQueueForLater, mSavePref);
}
 
nsIMsgFolder *
nsMsgCopy::GetDraftsFolder(nsIMsgIdentity *userIdentity)
{
  return LocateMessageFolder(userIdentity, nsMsgSaveAsDraft, mSavePref);
}

nsIMsgFolder *
nsMsgCopy::GetTemplatesFolder(nsIMsgIdentity *userIdentity)
{
  return LocateMessageFolder(userIdentity, nsMsgSaveAsTemplate, mSavePref);
}

nsIMsgFolder * 
nsMsgCopy::GetSentFolder(nsIMsgIdentity *userIdentity)
{
  return LocateMessageFolder(userIdentity, nsMsgDeliverNow, mSavePref);
}

////////////////////////////////////////////////////////////////////////////////////
// Utility Functions for MsgFolders
////////////////////////////////////////////////////////////////////////////////////
nsIMsgFolder *
LocateMessageFolder(nsIMsgIdentity   *userIdentity, 
                    nsMsgDeliverMode aFolderType,
                    const char       *aFolderURI)
{
  nsresult                  rv = NS_OK;
  nsIMsgFolder              *msgFolder = nsnull;

  if (!userIdentity || !aFolderURI || (PL_strlen(aFolderURI) == 0)) {
    return nsnull;
  }
  
  //
  // get the current mail session....
  //
  NS_WITH_SERVICE(nsIMsgMailSession, mailSession, kCMsgMailSessionCID, &rv); 
  if (NS_FAILED(rv)) 
    return nsnull;
  
  nsCOMPtr<nsIMsgAccountManager> accountManager;
  rv = mailSession->GetAccountManager(getter_AddRefs(accountManager));
  if (NS_FAILED(rv)) 
    return nsnull;

  // as long as it doesn't start with anyfolder://
  if (PL_strncasecmp(ANY_SERVER, aFolderURI, PL_strlen(aFolderURI)) != 0) {
    nsCOMPtr<nsIMsgIncomingServer> incomingServer;
    rv = accountManager->FindServerUsingURI(aFolderURI, getter_AddRefs(incomingServer));
    if (NS_FAILED(rv))
      return nsnull;

    nsCOMPtr <nsIFolder> aFolder;
    rv = incomingServer->GetRootFolder(getter_AddRefs(aFolder));
    if (NS_FAILED(rv) || (!aFolder))
      return nsnull;
        
    nsCOMPtr<nsIMsgFolder> rootFolder;
    rootFolder = do_QueryInterface(aFolder, &rv);
    
    if(NS_FAILED(rv) || (!rootFolder))
      return nsnull;

    rv = rootFolder->GetChildWithURI(aFolderURI, PR_TRUE /* deep */, &msgFolder);
    if (NS_SUCCEEDED(rv) && (msgFolder)) 
      return msgFolder;
    
    /* we failed to find the folder, so we create it in the datasource so
       we have something to return to pass into DoCopy()
       see bug #14591  */
    rv = rootFolder->CreateFolderInDatasource(aFolderURI, &msgFolder);
    if (NS_SUCCEEDED(rv) && (msgFolder)) {
      return msgFolder;
    }
  }
  else {
    PRUint32                  cnt = 0;
    PRUint32                  i;
    
    // if anyfolder will do, go look for one.
    nsCOMPtr<nsISupportsArray> retval; 
    accountManager->GetServersForIdentity(userIdentity, getter_AddRefs(retval)); 
    if (!retval) 
      return nsnull; 
    
    // Ok, we have to look through the servers and try to find the server that
    // has a valid folder of the type that interests us...
    rv = retval->Count(&cnt);
    if (NS_FAILED(rv))
      return nsnull;
    
    
    for (i=0; i<cnt; i++) {
      // Now that we have the server...we need to get the named message folder
      nsCOMPtr<nsIMsgIncomingServer> inServer; 
      nsCOMPtr<nsISupports>ptr;
      ptr = retval->ElementAt(i);
      
      inServer = do_QueryInterface(ptr, &rv);
      if(NS_FAILED(rv) || (!inServer))
        continue;
      
      //
      // If aFolderURI is passed in, then the user has chosen a specific
      // mail folder to save the message, but if it is null, just find the
      // first one and make that work. The folder is specified as a URI, like
      // the following:
      //
      //                  mailbox://rhp@netscape.com/Sent
      //                  imap://rhp@nsmail-2/Drafts
      //                  newsgroup://news.mozilla.org/netscape.test
      //
      char *serverURI = nsnull;
      rv = inServer->GetServerURI(&serverURI);
      if ( NS_FAILED(rv) || (!serverURI) || !(*serverURI) )
        continue;
      
      nsCOMPtr <nsIFolder> folder;
      rv = inServer->GetRootFolder(getter_AddRefs(folder));
      if (NS_FAILED(rv) || (!folder))
        continue;
      
      nsCOMPtr<nsIMsgFolder> rootFolder;
      rootFolder = do_QueryInterface(folder);
      
      if(NS_FAILED(rv) || (!rootFolder))
        continue;
      
      PRUint32 numFolders = 0;
      msgFolder = nsnull;
      
      // use the defaults by getting the folder by flags
      if (aFolderType == nsMsgQueueForLater)       // QueueForLater (Outbox)
        {
          rv = rootFolder->GetFoldersWithFlag(MSG_FOLDER_FLAG_QUEUE, &msgFolder, 1, &numFolders);
        }
      else if (aFolderType == nsMsgSaveAsDraft)    // SaveAsDraft (Drafts)
        {
          rv = rootFolder->GetFoldersWithFlag(MSG_FOLDER_FLAG_DRAFTS, &msgFolder, 1, &numFolders);
        }
      else if (aFolderType == nsMsgSaveAsTemplate) // SaveAsTemplate (Templates)
        {
          rv = rootFolder->GetFoldersWithFlag(MSG_FOLDER_FLAG_TEMPLATES, &msgFolder, 1, &numFolders);
        }
      else // SaveInSentFolder (Sent) -  nsMsgDeliverNow
        {
          rv = rootFolder->GetFoldersWithFlag(MSG_FOLDER_FLAG_SENTMAIL, &msgFolder, 1, &numFolders);
        }

      if (NS_SUCCEEDED(rv) && msgFolder) {
        return msgFolder;
      }
    }
  }
  
  return nsnull;
}

//
// Figure out if a folder is local or not and return a boolean to 
// say so.
//
nsresult
MessageFolderIsLocal(nsIMsgIdentity   *userIdentity, 
                     nsMsgDeliverMode aFolderType,
                     const char       *aFolderURI,
		     PRBool 	      *aResult)
{
  nsresult rv;
  nsXPIDLCString scheme;

  if (!aFolderURI) return NS_ERROR_NULL_POINTER;

  /* nsImapService::NewURI() isn't implemented yet... */
#ifdef MSCOTT_IMPLEMENTED_NEWURI_FOR_IMAP
  nsCOMPtr <nsIURI> uri;
  NS_WITH_SERVICE(nsIIOService, pNetService, kIOServiceCID, &rv); 
  if (NS_FAILED(rv)) return rv;
  
  rv = pNetService->NewURI(aFolderURI, nsnull, getter_AddRefs(uri));
  if (NS_FAILED(rv)) return rv;

  rv = uri->GetScheme(getter_Copies(scheme));
  if (NS_FAILED(rv)) return rv;
#else
  nsCOMPtr <nsIURL> url;
  rv = nsComponentManager::CreateInstance(kStandardUrlCID, nsnull, nsCOMTypeInfo<nsIURL>::GetIID(), getter_AddRefs(url));
  if (NS_FAILED(rv)) return rv;

  rv = url->SetSpec(aFolderURI);
  if (NS_FAILED(rv)) return rv;
 
  rv = url->GetScheme(getter_Copies(scheme));
  if (NS_FAILED(rv)) return rv;
#endif
  /* mailbox:/ means its local (on disk) */
  if (PL_strcmp("mailbox", (const char *)scheme) == 0) {
	*aResult = PR_TRUE;
  }
  else {
	*aResult = PR_FALSE;
  }
  return NS_OK;
}

