import os
import json
from meeting_helper import join_chime_meeting, join_webex_meeting, join_teams_meeting

def handler(event, context):
    # Parse the meeting info from the event
    meeting_info = json.loads(event['Records'][0]['Sns']['Message'])
    
    platform = meeting_info.get('platform')
    meeting_url = meeting_info.get('meeting_url')
    
    if platform == 'chime':
        join_chime_meeting(meeting_url)
    elif platform == 'webex':
        join_webex_meeting(meeting_url)
    elif platform == 'teams':
        join_teams_meeting(meeting_url)
    else:
        raise ValueError(f'Unsupported platform: {platform}')

    return {
        'statusCode': 200,
        'body': json.dumps('Meeting processed successfully')
    }

