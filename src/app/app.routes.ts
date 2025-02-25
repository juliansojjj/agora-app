import { Routes } from '@angular/router';
import { NotFoundComponent } from './core/components/not-found/not-found.component';
import { LoginComponent } from './features/auth/login/login.component';
import { SignupComponent } from './features/auth/signup/signup.component';
import { nonAuthGuard } from './core/guards/non-auth.guard';
import { FavoritesComponent } from './features/user/components/favorites/favorites.component';
import { ProfileComponent } from './features/user/components/profile/profile.component';
import { authGuard } from './core/guards/auth.guard';
import { AboutComponent } from './core/components/about/about.component';
import { SitemapComponent } from './core/components/sitemap/sitemap.component';
import { SearchComponent } from './core/components/search/search.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './features/articles/components/home-articles/home-articles.component'
      ).then((c) => c.HomeArticlesComponent),
  },

  {
    path: 'article/:id',
    loadComponent: () =>
      import(
        './features/articles/components/single-article/single-article.component'
      ).then((c) => c.SingleArticleComponent),
  },

  {
    path: 'author/:id',
    loadComponent: () =>
      import(
        './features/articles/components/author/author.component'
      ).then((c) => c.AuthorComponent),
  },

  {
    path: 'category/:title',
    loadComponent: () =>
      import(
        './features/articles/components/category-articles/category-articles.component'
      ).then((c) => c.CategoryArticlesComponent),
  },

  { path: 'login', component: LoginComponent, canActivate: [nonAuthGuard], title: 'Login' },
  { path: 'register', component: SignupComponent, canActivate: [nonAuthGuard], title: 'Register' },

  { path: 'favorites', component: FavoritesComponent, canActivate: [authGuard], title: 'Favorites' },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard], title: 'Profile' },

  { path: 'search', loadComponent: () =>
    import(
      './core/components/search/search.component'
    ).then((c) => c.SearchComponent), title: 'Search' },

  { path: 'about', component: AboutComponent, title: 'About' },
  {
    path: 'sitemap',
    loadComponent: () =>
      import(
        './core/components/sitemap/sitemap.component'
      ).then((c) => c.SitemapComponent),
  },

  { path: '**', component: NotFoundComponent, title: 'Page Not Found' },

];