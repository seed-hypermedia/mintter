import {MainWrapper} from '@/components/main-wrapper'
import {useDraftList} from '@/models/documents'
import {useOpenDraft} from '@/utils/open-draft'
import {
  Container,
  Footer,
  H2,
  List,
  SizableText,
  Tooltip,
  View,
  XStack,
} from '@shm/ui'

export default function ContentPage() {
  const draftList = useDraftList()
  const openDraft = useOpenDraft('push')

  return (
    <>
      <MainWrapper>
        <View height="100vh" alignSelf="stretch">
          <List
            items={draftList.data || []}
            fixedItemHeight={52}
            header={
              <Container>
                <H2>My Content</H2>
              </Container>
            }
            footer={<View height={20} />}
            renderItem={({item}: {item: string}) => {
              if (!item) return <View height={1} />
              return (
                <XStack
                  paddingVertical="$1.5"
                  w="100%"
                  gap="$2"
                  ai="center"
                  paddingHorizontal="$4"
                  maxWidth={900}
                  onPress={() => {
                    openDraft({id: item})
                  }}
                  group="item"
                >
                  <Tooltip content={`Draft coming soon.`}>
                    <SizableText fontWeight={'bold'}>Draft {item}</SizableText>
                  </Tooltip>
                  <View f={1} />
                </XStack>
              )
            }}
          />
        </View>
      </MainWrapper>
      <Footer></Footer>
    </>
  )
}
