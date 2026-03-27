# Ideas of what to add to the app

## Things to add

1. Read through the TODO's in the codebase and implement them.

2. I'm thinking some sort of auth for the API so people can't hit it directly without that. Maybe the user has the ability to generate their own API key and it's shown once but hidden after that with a warning. They can always regenerate their own for their access to the API.

3. Some sort of local storage/cookie to keep the user logged in on their browser for 30 days (if they check a box when they enter the code they get emailed to them)

4. All classes/functions/properties documented

5. Webpage like Swagger for how to use the API

6. Ensure that the database connection/interaction is all done through interfaces so the backend can be swapped easily.

7. Ability to have multiple lists

- Hierarchy will be [User account] -> [lists] -> [tasks]

6. printer friendly view for the lists that print them out with little checkboxes, like if I'm using this as a grocery list.

7. Have different states for the tasks

8. Have due dates for tasks

9. Ability to pick an emoji that represents each list

10. have a "today view", "this week", this month, etc.

- month view is a calendar with dots representing days with tasks. The dots will be in the color of the list. This will lead into the next thing in here where the user can assign color themes to a list.

11. Ability to choose color themes for each list. Like several really nice looking gradients for the background. These color themes default to something new each time a new list is made, but the user can change them.

12. Mobile friendly, and also works on a desktop computer.

13. Fully tested with integration tests, unit tests, and some sort of UI tests, I'd like the ability to see the test report

14. have notes, URL, and other helpful fields for each task.

15. Ability to toggle a view of completed tasks.

16. Github CI, like what I have for my other websites, where it builds, tests, publishes, and increments versions, see this on disk: `/Volumes/D/Scobellis/.gith/workflows`

17. no secrets stored in the repo.

18. Test coverage as a badge on the readme, versions of the infrastrucutre and the app version in the readme, like in `/Volumes/Development/Scobellis`

19. README.md for the frontend, README.md for the backend that describes how to build them, how to run them, how to test them. These readme's will be linked to the repo's root readme.

20. different views like swimlanes to show what's todo, in progress, done.

## Out of scope features

1. Out of scope, but the ability to update profile picture, ability to attach images or files to the task.

2. Out of scope, MCP wrapper for the API

3. Database for user information is stored securely. This is out of scope for this project, but something I'd like, especially with personal info and API keys being stored.
