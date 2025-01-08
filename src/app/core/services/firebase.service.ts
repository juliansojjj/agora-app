import { inject, Injectable, input } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  signInWithEmailAndPassword,
  authState,
  user,
  updateEmail,
} from '@angular/fire/auth';
import { catchError, debounceTime, filter, forkJoin, from, map, Observable, ObservableInput, of, take, throwError } from 'rxjs';
import {
  FirebaseAuthUser,
  FirestoreCollectionUser,
} from '../../shared/interfaces/firebase.interfaces';
import { documentId } from 'firebase/firestore';
import {
  addDoc,
  collection,
  Firestore,
  doc,
  getDoc,
  query,
  where,
  limit,
  orderBy,
  DocumentData,
  setDoc,
  updateDoc,
  collectionData,
  serverTimestamp,
  FieldValue,
  arrayUnion,
  arrayRemove,
  docData
} from '@angular/fire/firestore';
import { AbstractControl } from '@angular/forms';
import { Article } from '../../shared/interfaces/article.interface';
import { updatePassword } from 'firebase/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})

export class FirebaseService {
  authService = inject(Auth);
  firestoreService = inject(Firestore);
  router = inject(Router)

  //authState es obs https://github.com/FirebaseExtended/rxfire/blob/main/docs/auth.md
  authState$ = authState(this.authService);
  //lo mismo con user
  user$: Observable<FirebaseAuthUser> = user(this.authService);

  constructor() {}


// ----------------------- ARTICLES
  getLandingArticles() {
    const ref = collection(this.firestoreService, 'articles');
    const result = collectionData(ref, { idField: 'articleID' });
    return from(result);
  }

  getAuthorArticles(authorID:string, max?:number){
    const ref = collection(this.firestoreService, 'articles')

    if(max) return from(collectionData(query(ref,where('authorID','==',authorID),orderBy('date', 'desc'),limit(max)), { idField: 'articleID' }))
      else return from(collectionData(query(ref,where('authorID','==',authorID)), { idField: 'articleID' }))
  }

  getFavoriteArticles(ids:string[]){
    const ref = collection(this.firestoreService, 'articles')

    if(ids.length <= 30){
      const result = collectionData(query(ref,where(documentId(),'in',ids)), { idField: 'articleID' })
      return from(result).pipe(
        map((articles) =>
          articles.sort((a: any, b: any) => ids.indexOf(b.articleID) - ids.indexOf(a.articleID)) 
        )
      );
    }
    else{
      const chunkedArrays:string[][] = []
      for (let i = 0; i < ids.length; i += 30) {
        chunkedArrays.push(ids.slice(i,i+30))
      }

      const observables = chunkedArrays.map((chunk) => {
        return from(
          collectionData(query(ref, where(documentId(), 'in', chunk)), { idField: 'articleID' })
        ).pipe(take(1))
      })

      return forkJoin(observables).pipe(
        map((results) => {
          // Flatten and sort by the order in the original array
          const flattenedResults = results.flat();
          return flattenedResults.sort(
            (a: any, b: any) => ids.indexOf(b.articleID) - ids.indexOf(a.articleID)
          );
        })
      )
    }
  }

  getMainCategoryArticles(category:string, max?:number) {
    const categoryArray = category.split(' ')
    const name = categoryArray.join('-').toLowerCase()

    const ref = collection(this.firestoreService, 'articles')
    if(max) return from(collectionData(query(ref,where('category','==', name),orderBy('date', 'desc'),limit(max)), { idField: 'articleID' }))
    else return from(collectionData(query(ref,where('category','==', name)), { idField: 'articleID' }))
  }
  getCategoryArticles(category:string) {
    const categoryArray = category.split(' ')
    const name = categoryArray.join('-').toLowerCase()
    
    const ref = collection(this.firestoreService, 'articles')
    const result = collectionData(query(ref,where('urlTopics','array-contains', name)), { idField: 'articleID' })

    return from(result);
  }


  getSingleArticle(id:string) {
    const ref = doc(this.firestoreService, 'articles', id);
    const result = docData(ref)

    return from(result)
  }
  
  getArticleComments(id:string){
    const ref = collection(this.firestoreService, 'articles',id,'comments');
    const result = collectionData(ref,{ idField: 'commentId' });

    return from(result)
  }


  // ----------------------- FIRESTORE

  
  getCategory(url:string) {
    const ref = collection(this.firestoreService, 'categories')
    const result = collectionData(query(ref,where('url','==',url)))

    return from(result);
  }
  
  getAuthor(id:string) {
    const ref = doc(this.firestoreService, 'authors', id);
    const result = docData(ref)

    return from(result);
  }

  
  handleFavorite(uid:string,operation:boolean, articleID:string){
    const ref = doc(this.firestoreService, 'users', uid);

    return operation 
    ? from(updateDoc(ref,{favorites:arrayUnion(articleID)})) 
    : from(updateDoc(ref,{favorites:arrayRemove(articleID)})) 
  }

  getUserInfo(uid:string){
    const ref = doc(this.firestoreService, 'users', uid);
    const result = docData(ref)

    return from(result)
  }
  getUsers(){
    const ref = collection(this.firestoreService, 'users');
    const result = collectionData(ref);
    return from(result);
  }
  checkUsername() {
    
    const ref = collection(this.firestoreService, 'users');
    const result = collectionData(ref);
    return (control: AbstractControl) => {
      return from(result).pipe(
        debounceTime(200),
        take(1),
        map((users: FirestoreCollectionUser[]) => {
          return users.filter(
            (item: FirestoreCollectionUser) =>
              item.username.toLowerCase() == control.value.toLowerCase(),
          ).length
            ? { usernameTaken: true }
            : null;
        }),
      );
    };
  }

  updateUsername(newUsername:string){
    if(this.authService.currentUser) {
      const uid = this.authService.currentUser?.uid
      const ref = doc(this.firestoreService, 'users', uid)

      const firestoreRes = updateDoc(ref,{username:newUsername})
      const authRes = updateProfile(this.authService.currentUser, { displayName: newUsername })

      return forkJoin([firestoreRes,authRes])

    } else return throwError(()=>new Error('Your current session is to old, please login again'))
  }
  updateUserEmail(newEmail:string){
    if(this.authService.currentUser) {
      const uid = this.authService.currentUser?.uid
      const ref = doc(this.firestoreService, 'users', uid)

      return from(updateEmail(this.authService.currentUser,newEmail)).pipe(
        map(()=>{
          from(updateDoc(ref,{email:newEmail}))
        }),
        catchError(err=>throwError(()=>err))
      )

    } else return throwError(()=>new Error('Your current session is to old, please login again'))
  }
  updateUserPassword(newPassword:string){
    if(this.authService.currentUser) {
      return from(updatePassword(this.authService.currentUser,newPassword))

    } else return throwError(()=>new Error('Your current session is to old, please login again'))
  }

  documentUser(username: string, email: string, id:string) {
    const ref = collection(this.firestoreService, 'users');
    const res = setDoc(doc(ref, id),
    { 
      username: username,
      email: email,
      subscription: false,
    } )

    return from(res)
  }

  addComment(username: string, uid: string, articleID:string, content:string) {
    const ref = collection(this.firestoreService, 'articles',articleID,'comments');

    const res = setDoc(doc(ref),
    { 
      username: username,
      uid:uid,
      content:content,
      date:serverTimestamp(),
      deletedByUser:false
    } )

    return from(res)

  }
  deleteComment(articleID:string,commentId:string){
    const ref = collection(this.firestoreService, 'articles',articleID,'comments');
    const res = updateDoc(doc(ref, commentId),
    { 
      deletedByUser: true
    } )
    return from(res)
  }

  // ----------------------- AUTH
  signup(username: string, email: string, password: string){
    const createUser = createUserWithEmailAndPassword(this.authService, email, password)

    return from(createUser).pipe(
      map(res=>{
        console.log('hola?')
        return forkJoin([
          updateProfile(res.user, { displayName: username }),
          this.documentUser(username, email,res.user.uid)
        ])
      }),
      catchError(err=>throwError(()=>err))
    );
  }

  login(email: string, password: string){
    return from(signInWithEmailAndPassword(this.authService,email,password)).pipe(
      map(res=>res),
      catchError(err=>throwError(()=>err))
    )
  }

  logout() {
    signOut(this.authService);
    this.router.navigate(['/'])
  }
}
