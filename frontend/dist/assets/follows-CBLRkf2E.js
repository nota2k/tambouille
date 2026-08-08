<<<<<<< Updated upstream
<<<<<<<< Updated upstream:frontend/dist/assets/follows-CBLRkf2E.js
import{s as e}from"./index-CyfEU_i_.js";async function t(t){let n=t.isFollowing;t.isFollowing=!n,t.followersCount+=n?-1:1;try{n?await e.delete(`/users/${t.username}/follow`):await e.post(`/users/${t.username}/follow`)}catch(e){throw t.isFollowing=n,t.followersCount+=n?1:-1,e}}export{t};
========
=======
>>>>>>> Stashed changes
<<<<<<<< HEAD:frontend/dist/assets/follows-YhAHPCTL.js
import{s as e}from"./index-BzOp1GI-.js";async function t(t){let n=t.isFollowing;t.isFollowing=!n,t.followersCount+=n?-1:1;try{n?await e.delete(`/users/${t.username}/follow`):await e.post(`/users/${t.username}/follow`)}catch(e){throw t.isFollowing=n,t.followersCount+=n?1:-1,e}}export{t};
========
import{s as e}from"./index-CyfEU_i_.js";async function t(t){let n=t.isFollowing;t.isFollowing=!n,t.followersCount+=n?-1:1;try{n?await e.delete(`/users/${t.username}/follow`):await e.post(`/users/${t.username}/follow`)}catch(e){throw t.isFollowing=n,t.followersCount+=n?1:-1,e}}export{t};
>>>>>>>> c02cb36 (fix(frontend): ship a build that targets the production API):frontend/dist/assets/follows-CBLRkf2E.js
<<<<<<< Updated upstream
>>>>>>>> Stashed changes:frontend/dist/assets/follows-YhAHPCTL.js
=======
>>>>>>> Stashed changes
