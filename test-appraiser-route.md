# Appraiser Route Test

Try navigating directly to this URL in your browser while logged in as the appraiser:

```
/campaigns/cw8RuQIfFFV6QLskLOAj/participants/cw8RuQIfFFV6QLskLOAj_DONOR_USER_ID/tasks
```

Where DONOR_USER_ID should be replaced with the actual donor's user ID.

If this works, the issue is in the redirect URL calculation.
If this fails with the same error, the issue is in the route authorization.

The appraiser should be user ID: AmeGIA2GHOXCzMoWlZjMMURF2v43