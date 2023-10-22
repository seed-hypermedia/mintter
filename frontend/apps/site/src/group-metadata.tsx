import {Role, createHmId, unpackHmId} from '@mintter/shared'
import {HMGroup} from '@mintter/shared/src/json-hm'
import {SideSection, SideSectionTitle, SizableText, Tooltip} from '@mintter/ui'
import {format} from 'date-fns'
import {AccountRow} from './account-row'
import {OpenInAppLink} from './metadata'
import {trpc} from './trpc'

export function GroupMetadata({
  group,
  groupId,
}: {
  group?: null | HMGroup
  groupId: string
}) {
  if (!group) return null
  const time = group.createTime
  const unpackedGroupId = unpackHmId(groupId)
  return (
    <>
      {group.ownerAccountId && (
        <GroupOwnerSection owner={group.ownerAccountId} />
      )}
      {group.id && <GroupEditorsSection group={group} />}
      {time && <LastUpdateSection time={time} />}

      {unpackedGroupId && unpackedGroupId?.type === 'g' && (
        <SideSection>
          <OpenInAppLink
            url={createHmId('g', unpackedGroupId.eid, {version: group.version})}
          />
        </SideSection>
      )}
    </>
  )
}

function GroupOwnerSection({owner}: {owner: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Owner:</SideSectionTitle>
      <AccountRow account={owner} />
    </SideSection>
  )
}

function GroupEditorsSection({group}: {group: HMGroup}) {
  const groupMembers = trpc.group.listMembers.useQuery({
    groupId: group.id || '',
    version: group.version,
  })
  if (!groupMembers.data) return null
  const editors = groupMembers.data.filter(
    (member) => member.role === Role.EDITOR,
  )
  if (!editors.length) return null
  return (
    <SideSection>
      <SideSectionTitle>Editors:</SideSectionTitle>
      {editors.map((member) => {
        return <AccountRow key={member.account} account={member?.account} />
      })}
    </SideSection>
  )
}

function LastUpdateSection({time}: {time: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Last Update:</SideSectionTitle>

      <Tooltip content={format(new Date(time), 'MMMM do yyyy, HH:mm:ss z')}>
        <SizableText size="$2">
          {format(new Date(time), 'EEEE, MMMM do, yyyy')}
        </SizableText>
      </Tooltip>
    </SideSection>
  )
}
